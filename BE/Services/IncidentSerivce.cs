using BE.Data;
using BE.DTOs.Incidents;
using BE.Exceptions;
using BE.Models;
using BE.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace BE.Services.Identify;

// Class đơn giản để trả kết quả phân trang
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new List<T>();
    public int TotalItems { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}

public class IncidentService
{
    private readonly GymManagementContext _db;
    private readonly S3StorageService _storage;

    public IncidentService(GymManagementContext db, S3StorageService storage)
    {
        _db = db;
        _storage = storage;
    }

    public async Task CreateAsync(CreateIncidentDto dto, JwtUserInfo user)
    {
        if (dto.EquipmentId.HasValue)
        {
            var equipment = await _db.Equipment.FindAsync(dto.EquipmentId);
            if (equipment == null)
            {
                throw new Exception("Thiết bị không tồn tại");
            }
        }

        long? memberId = null;
        long? employeeId = null;
        int? branchId = null;

        if (user.EntityType == "Member")
        {
            var member = await _db.Members.FindAsync(user.Id);
            if (member == null)
            {
                throw new Exception("Hội viên không tồn tại");
            }

            if (member.Status == "PendingActivation")
            {
                throw new Exception("Tài khoản hội viên chưa kích hoạt");
            }

            memberId = member.MemberId;
            branchId = dto.BranchId;

            if (!branchId.HasValue)
            {
                throw new Exception("Vui lòng chọn chi nhánh");
            }
        }
        else
        {
            var employee = await _db.Employees.FirstOrDefaultAsync(x => x.EmployeeId == user.Id);
            if (employee == null)
            {
                throw new Exception("Nhân viên không tồn tại.");
            }

            employeeId = employee.EmployeeId;

            branchId = await _db.Employees
                .Where(e => e.EmployeeId == employee.EmployeeId)
                .SelectMany(e => e.Branches)
                .Select(b => (int?)b.BranchId)
                .FirstOrDefaultAsync();

            if (!branchId.HasValue)
            {
                throw new Exception("Nhân viên chưa được gán chi nhánh.");
            }
        }

        var incident = new Incident
        {
            Title = dto.Title,
            Description = dto.Description,
            BranchId = branchId.Value,
            EquipmentId = dto.EquipmentId,
            ReportedByMemberId = memberId,
            ReportedByEmployeeId = employeeId,
            Status = "PendingApproval",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Incidents.Add(incident);
        await _db.SaveChangesAsync();

        bool hasMedia = false;

        if (dto.Images != null)
        {
            foreach (var image in dto.Images)
            {
                string url = await _storage.UploadFileAsync(image, "incidents/images");

                _db.IncidentMedias.Add(new IncidentMedia
                {
                    IncidentId = incident.IncidentId,
                    MediaType = "Image",
                    MediaUrl = url,
                    CreatedAt = DateTime.UtcNow
                });

                hasMedia = true;
            }
        }

        if (dto.Video != null)
        {
            string url = await _storage.UploadFileAsync(dto.Video, "incidents/videos");

            _db.IncidentMedias.Add(new IncidentMedia
            {
                IncidentId = incident.IncidentId,
                MediaType = "Video",
                MediaUrl = url,
                CreatedAt = DateTime.UtcNow
            });

            hasMedia = true;
        }

        if (hasMedia)
        {
            await _db.SaveChangesAsync();
        }
    }

    public async Task<PagedResult<IncidentListDto>> GetListAsync(IncidentFilterDto filter, JwtUserInfo user)
    {
        // QUAN TRỌNG: phải ThenInclude(Account) thì mới lấy được số điện thoại của hội viên
        var query = _db.Incidents
            .Include(i => i.Branch)
            .Include(i => i.Equipment)
            .Include(i => i.ReportedByEmployee)
            .Include(i => i.ReportedByMember)
                .ThenInclude(m => m.Account)
            .AsQueryable();

        // Lọc theo người báo cáo là Member hay Staff
        if (!string.IsNullOrWhiteSpace(filter.ReportRole))
        {
            if (filter.ReportRole.Equals("Member", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(i => i.ReportedByMemberId != null);
            }
            else if (filter.ReportRole.Equals("Staff", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(i => i.ReportedByEmployeeId != null);
            }
            else
            {
                throw new BadRequestException("Người gửi báo cáo không hợp lệ");
            }
        }

        // Lọc theo từ khóa
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            query = query.Where(i =>
                i.Title.Contains(filter.Keyword) ||
                i.Description.Contains(filter.Keyword));
        }

        // Lọc theo quyền của nhân viên
        if (user.EntityType == "Employee")
        {
            var employee = await _db.Employees
                .Include(e => e.Account).ThenInclude(a=>a.Role)
                .FirstOrDefaultAsync(e => e.EmployeeId == user.Id);

            if (employee == null)
            {
                throw new Exception("Nhân viên không tồn tại!");
            }

            bool isAdmin = employee.Account.Role.RoleId == 3;
            bool isManager = employee.Account.Role.RoleId == 2;

            if (isAdmin)
            {
                if (filter.BranchId.HasValue)
                {
                    query = query.Where(i => i.BranchId == filter.BranchId);
                }
            }
            else if (isManager)
            {
                var managedBranchIds = await _db.Employees
                    .Where(e => e.EmployeeId == user.Id)
                    .SelectMany(e => e.Branches)
                    .Select(b => b.BranchId)
                    .ToListAsync();

                if (filter.BranchId.HasValue)
                {
                    if (!managedBranchIds.Contains(filter.BranchId.Value))
                    {
                        throw new Exception("Bạn không có quyền xem chi nhánh này");
                    }

                    query = query.Where(i => i.BranchId == filter.BranchId);
                }
                else
                {
                    query = query.Where(i => managedBranchIds.Contains(i.BranchId));
                }
            }
            else
            {
                query = query.Where(i => i.ReportedByEmployeeId == user.Id);
            }
        }
        else if (filter.BranchId.HasValue)
        {
            query = query.Where(i => i.BranchId == filter.BranchId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            query = query.Where(i => i.Status == filter.Status);
        }

        // Sắp xếp: báo cáo chờ duyệt lên trước, sau đó mới tới ngày tạo mới nhất
        query = query
            .OrderBy(i => i.Status == "PendingApproval" ? 0 : 1)
            .ThenByDescending(i => i.CreatedAt);

        // Đếm tổng số bản ghi để tính tổng số trang
        int totalItems = await query.CountAsync();

        // Đảm bảo Page và PageSize hợp lệ
        int page = filter.Page < 1 ? 1 : filter.Page;
        int pageSize = filter.PageSize < 1 ? 10 : filter.PageSize;

        var incidents = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Lấy ảnh đại diện (thumbnail) cho từng incident
        List<int> ids = new List<int>();
        foreach (var i in incidents)
        {
            ids.Add(i.IncidentId);
        }

        var thumbnails = await _db.IncidentMedias
            .Where(m => ids.Contains(m.IncidentId) && m.MediaType == "Image")
            .OrderBy(m => m.MediaId)
            .GroupBy(m => m.IncidentId)
            .Select(g => new { IncidentId = g.Key, MediaUrl = g.First().MediaUrl })
            .ToListAsync();

        Dictionary<int, string> thumbnailMap = new Dictionary<int, string>();
        foreach (var t in thumbnails)
        {
            thumbnailMap[t.IncidentId] = t.MediaUrl;
        }

        // Build danh sách DTO trả về
        List<IncidentListDto> items = new List<IncidentListDto>();
        foreach (var i in incidents)
        {
            string? thumbnail = null;
            if (thumbnailMap.ContainsKey(i.IncidentId))
            {
                thumbnail = thumbnailMap[i.IncidentId];
            }

            string reporterName;
            string reporterPhone;
            string reporterRole;

            if (i.ReportedByMember != null)
            {
                reporterName = i.ReportedByMember.FullName;
                // Kiểm tra null để tránh lỗi giống dòng 263 cũ
                reporterPhone = i.ReportedByMember.Account != null ? i.ReportedByMember.Phone: "";
                reporterRole = "Member";
            }
            else
            {
                reporterName = i.ReportedByEmployee!.FullName;
                reporterPhone = i.ReportedByEmployee.Phone;
                reporterRole = "Employee";
            }

            items.Add(new IncidentListDto
            {
                IncidentId = i.IncidentId,
                Title = i.Title,
                BranchName = i.Branch.BranchName,
                EquipmentName = i.Equipment?.EquipmentName,
                ReporterName = reporterName,
                ReporterPhone = reporterPhone,
                ReporterRole = reporterRole,
                Status = i.Status,
                CreatedAt = i.CreatedAt,
                Thumbnail = thumbnail
            });
        }

        // Tính tổng số trang
        int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        return new PagedResult<IncidentListDto>
        {
            Items = items,
            TotalItems = totalItems,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<IncidentDetailDto?> GetByIdAsync(int id)
    {
        var incident = await _db.Incidents
            .Include(x => x.Branch)
            .Include(x => x.Equipment)
            .Include(x => x.ReportedByMember)
                .ThenInclude(m => m.Account)
            .Include(x => x.ReportedByEmployee)
            .FirstOrDefaultAsync(x => x.IncidentId == id);

        if (incident == null)
        {
            return null;
        }

        var medias = await _db.IncidentMedias
            .Where(x => x.IncidentId == id)
            .ToListAsync();

        List<IncidentMediaDto> mediaDtos = new List<IncidentMediaDto>();
        foreach (var m in medias)
        {
            mediaDtos.Add(new IncidentMediaDto
            {
                MediaType = m.MediaType,
                MediaUrl = m.MediaUrl
            });
        }

        string reporterName;
        string reporterPhone;
        string reporterRole;

        if (incident.ReportedByMember != null)
        {
            reporterName = incident.ReportedByMember.FullName;
            reporterPhone = incident.ReportedByMember.Account != null ? incident.ReportedByMember.Phone : "";
            reporterRole = "Member";
        }
        else
        {
            reporterName = incident.ReportedByEmployee!.FullName;
            reporterPhone = incident.ReportedByEmployee.Phone;
            reporterRole = "Employee";
        }

        return new IncidentDetailDto
        {
            IncidentId = incident.IncidentId,
            Title = incident.Title,
            Description = incident.Description,
            BranchId = incident.BranchId,
            BranchName = incident.Branch.BranchName,
            EquipmentId = incident.EquipmentId,
            EquipmentName = incident.Equipment?.EquipmentName,
            ReporterName = reporterName,
            ReporterPhone = reporterPhone,
            ReporterRole = reporterRole,
            Status = incident.Status,
            RejectReason = incident.RejectReason,
            CreatedAt = incident.CreatedAt,
            UpdatedAt = incident.UpdatedAt,
            Medias = mediaDtos
        };
    }

    public async Task UpdateAsync(int incidentId, UpdateIncidentDto dto, JwtUserInfo user)
    {
        if (user.Role != "Manager" && user.Role != "Admin")
        {
            throw new Exception("Chỉ Quản lý hoặc Quản trị viên mới được cập nhật báo cáo.");
        }

        var incident = await _db.Incidents.FirstOrDefaultAsync(x => x.IncidentId == incidentId);
        if (incident == null)
        {
            throw new Exception("Không tìm thấy báo cáo.");
        }

        if (incident.Status != "PendingApproval")
        {
            throw new Exception("Chỉ được sửa báo cáo đang chờ duyệt.");
        }

        incident.Title = dto.Title;
        incident.Description = dto.Description;
        incident.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task UpdateStatusAsync(int incidentId, UpdateIncidentStatusDto dto, JwtUserInfo user)
    {
        var incident = await _db.Incidents.FirstOrDefaultAsync(x => x.IncidentId == incidentId);
        if (incident == null)
        {
            throw new Exception("Không tìm thấy báo cáo.");
        }

        string[] validStatuses = { "PendingApproval", "Approved", "Completed", "Cancelled" };
        if (!validStatuses.Contains(dto.Status))
        {
            throw new Exception("Trạng thái không hợp lệ.");
        }

        if (incident.Status == "Completed" || incident.Status == "Cancelled")
        {
            throw new Exception("Báo cáo đã kết thúc, không thể thay đổi trạng thái.");
        }

        if (dto.Status == "Cancelled" && string.IsNullOrWhiteSpace(dto.RejectReason))
        {
            throw new Exception("Vui lòng nhập lý do hủy.");
        }

        incident.Status = dto.Status;
        incident.RejectReason = dto.Status == "Cancelled" ? dto.RejectReason : null;
        incident.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(int incidentId)
    {
        var incident = await _db.Incidents.FirstOrDefaultAsync(x => x.IncidentId == incidentId);
        if (incident == null)
        {
            throw new Exception("Không tìm thấy báo cáo.");
        }

        if (incident.Status != "PendingApproval")
        {
            throw new Exception("Chỉ được xóa báo cáo đang chờ duyệt.");
        }

        var medias = await _db.IncidentMedias
            .Where(x => x.IncidentId == incidentId)
            .ToListAsync();

        foreach (var media in medias)
        {
            await _storage.DeleteFileAsync(media.MediaUrl);
        }

        _db.IncidentMedias.RemoveRange(medias);
        _db.Incidents.Remove(incident);

        await _db.SaveChangesAsync();
    }
}