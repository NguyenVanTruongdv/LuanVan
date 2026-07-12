using BE.Data;
using BE.DTOs.Incidents;
using BE.Models;
using BE.Services.Storage;
using Microsoft.EntityFrameworkCore;

namespace BE.Services.Identify;

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
                throw new Exception("Thiết bị không tồn tại");
        }

        long? memberId = null;
        long? employeeId = null;
        int? branchId = null;

        if (user.EntityType == "Member")
        {
            var member = await _db.Members.FindAsync(user.Id);

            if (member == null)
                throw new Exception("Hội viên không tồn tại");

            if (member.Status == "PendingActivation")
                throw new Exception("Tài khoản hội viên chưa kích hoạt");

            memberId = member.MemberId;
            branchId = dto.BranchId;

            if (!branchId.HasValue)
                throw new Exception("Vui lòng chọn chi nhánh");
        }
        else
        {
            var employee = await _db.Employees
                .FirstOrDefaultAsync(x => x.EmployeeId == user.Id);

            if (employee == null)
                throw new Exception("Nhân viên không tồn tại.");

            employeeId = employee.EmployeeId;

            branchId = await _db.EmployeeBranches
                .Where(e => e.EmployeeId == employee.EmployeeId)
                .Select(e => (int?)e.Branch.BranchId)
                .FirstOrDefaultAsync();

            if (!branchId.HasValue)
                throw new Exception("Nhân viên chưa được gán chi nhánh.");
        }

        // Trước đây khối tạo Incident + lưu media nằm lồng bên trong "else",
        // nên khi người báo cáo là Member thì Incident KHÔNG BAO GIỜ được tạo.
        // Đưa ra ngoài để chạy chung cho cả 2 trường hợp Member/Employee.
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

        var hasMedia = false;

        if (dto.Images != null)
        {
            foreach (var image in dto.Images)
            {
                var url = await _storage.UploadFileAsync(image, "incidents/images");

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

        // Trước đây Video chỉ được xử lý khi Images != null.
        // Tách riêng để Video vẫn được lưu dù không có ảnh nào.
        if (dto.Video != null)
        {
            var url = await _storage.UploadFileAsync(dto.Video, "incidents/videos");

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
            await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Danh sách TẤT CẢ báo cáo sự cố (dành cho Manager/Admin duyệt, xem toàn bộ).
    /// Lọc theo từ khóa, chi nhánh, thiết bị, trạng thái.
    /// </summary>
    public async Task<List<IncidentListDto>> GetListAsync(IncidentFilterDto filter, JwtUserInfo user)
        {
            var query = _db.Incidents
                .Include(i => i.Branch)
                .Include(i => i.Equipment)
                .Include(i => i.ReportedByEmployee)
                .Include(i => i.ReportedByMember)
                .AsQueryable();

            // Lọc từ khóa (tiêu đề / mô tả)
            if (!string.IsNullOrWhiteSpace(filter.Keyword))
            {
                query = query.Where(i =>
                    i.Title.Contains(filter.Keyword) ||
                    i.Description.Contains(filter.Keyword));
            }

            // Phân quyền xem theo role, chỉ áp dụng khi người gọi là Employee
            if (user.EntityType == "Employee")
            {
                var employee = await _db.Employees
                    .Include(e => e.Role)
                    .FirstOrDefaultAsync(e => e.EmployeeId == user.Id);

                if (employee == null)
                    throw new Exception("Nhân viên không tồn tại!");

                var isAdmin = employee.Role.RoleId == 3;
                var isManager = employee.Role.RoleId == 2;

                if (isAdmin)
                {
                    // Admin: xem toàn bộ, chỉ lọc branch nếu FE có truyền lên
                    if (filter.BranchId.HasValue)
                        query = query.Where(i => i.BranchId == filter.BranchId);
                }
                else if (isManager)
                {
                    // Manager: chỉ được xem trong phạm vi chi nhánh mình quản lý
                    var managedBranchIds = await _db.EmployeeBranches
                        .Where(e => e.EmployeeId == user.Id)
                        .Select(e => e.BranchId)
                        .ToListAsync();

                    if (filter.BranchId.HasValue)
                    {
                        if (!managedBranchIds.Contains(filter.BranchId.Value))
                            throw new Exception("Bạn không có quyền xem chi nhánh này");

                        query = query.Where(i => i.BranchId == filter.BranchId);
                    }
                    else
                    {
                        query = query.Where(i => managedBranchIds.Contains(i.BranchId));
                    }
                }
                else
                {
                    // Thu ngân / nhân viên thường: chỉ xem báo cáo do chính mình gửi
                    query = query.Where(i => i.ReportedByEmployeeId == user.Id);
                }
            }
            else if (filter.BranchId.HasValue)
            {
                // Member (nếu có gọi tới endpoint này): lọc branch bình thường
                query = query.Where(i => i.BranchId == filter.BranchId);
            }

            // Lọc trạng thái
            if (!string.IsNullOrWhiteSpace(filter.Status))
                query = query.Where(i => i.Status == filter.Status);

            // Sắp xếp: 1. ngày tạo mới nhất trước  2. trạng thái "chưa duyệt" ưu tiên lên đầu
            var ordered = query
                .OrderByDescending(i => i.CreatedAt)
                .ThenBy(i => i.Status == "PendingApproval" ? 0 : 1);

            var incidents = await ordered
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var ids = incidents.Select(i => i.IncidentId).ToList();

            var thumbnails = await _db.IncidentMedias
                .Where(m => ids.Contains(m.IncidentId) && m.MediaType == "Image")
                .OrderBy(m => m.MediaId)
                .GroupBy(m => m.IncidentId)
                .Select(g => new { IncidentId = g.Key, MediaUrl = g.First().MediaUrl })
                .ToListAsync();

            var thumbnailMap = thumbnails.ToDictionary(x => x.IncidentId, x => x.MediaUrl);

            return incidents.Select(i => new IncidentListDto
            {
                IncidentId = i.IncidentId,
                Title = i.Title,
                BranchName = i.Branch.BranchName,
                EquipmentName = i.Equipment?.EquipmentName,

                ReporterName = i.ReportedByMember != null
                    ? i.ReportedByMember.FullName
                    : i.ReportedByEmployee!.FullName,

                ReporterPhone = i.ReportedByMember != null
                    ? i.ReportedByMember.Phone
                    : i.ReportedByEmployee!.Phone,

                ReporterRole = i.ReportedByMember != null ? "Member" : "Employee",

                Status = i.Status,
                CreatedAt = i.CreatedAt,

                Thumbnail = thumbnailMap.TryGetValue(i.IncidentId, out var url) ? url : null
            }).ToList();
}
    





    public async Task<IncidentDetailDto?> GetByIdAsync(int id)
    {
        var incident = await _db.Incidents
            .Include(x => x.Branch)
            .Include(x => x.Equipment)
            .Include(x => x.ReportedByMember)
            .Include(x => x.ReportedByEmployee)
            .FirstOrDefaultAsync(x => x.IncidentId == id);

        if (incident == null)
            return null;

        var medias = await _db.IncidentMedias
            .Where(x => x.IncidentId == id)
            .ToListAsync();

        return new IncidentDetailDto
        {
            IncidentId = incident.IncidentId,
            Title = incident.Title,
            Description = incident.Description,

            BranchId = incident.BranchId,
            BranchName = incident.Branch.BranchName,

            EquipmentId = incident.EquipmentId,
            EquipmentName = incident.Equipment?.EquipmentName,

            ReporterName = incident.ReportedByMember != null
                ? incident.ReportedByMember.FullName
                : incident.ReportedByEmployee!.FullName,

            ReporterPhone = incident.ReportedByMember != null
                ? incident.ReportedByMember.Phone
                : incident.ReportedByEmployee!.Phone,

            ReporterRole = incident.ReportedByMember != null
                ? "Member"
                : "Employee",

            Status = incident.Status,
            RejectReason = incident.RejectReason,

            CreatedAt = incident.CreatedAt,
            UpdatedAt = incident.UpdatedAt,

            Medias = medias.Select(x => new IncidentMediaDto
            {
                MediaType = x.MediaType,
                MediaUrl = x.MediaUrl
            }).ToList()
        };
    }

    public async Task UpdateAsync(int incidentId, UpdateIncidentDto dto, JwtUserInfo user)
    {
        var incident = await _db.Incidents
            .FirstOrDefaultAsync(x => x.IncidentId == incidentId);

        if (incident == null)
            throw new Exception("Không tìm thấy báo cáo.");

        // Chỉ chủ báo cáo (người đã tạo) mới được tự cập nhật/hủy báo cáo của mình
        // qua endpoint này. (Trang duyệt của Manager/Admin nếu có sẽ dùng luồng khác.)
        var isOwner = user.EntityType == "Member"
            ? incident.ReportedByMemberId == user.Id
            : incident.ReportedByEmployeeId == user.Id;

        if (!isOwner)
            throw new Exception("Bạn không có quyền cập nhật báo cáo này.");

        var branch = await _db.Branches.FindAsync(dto.BranchId);
        if (branch == null)
            throw new Exception("Chi nhánh không tồn tại.");

        if (dto.EquipmentId.HasValue)
        {
            var equipment = await _db.Equipment.FindAsync(dto.EquipmentId.Value);
            if (equipment == null)
                throw new Exception("Thiết bị không tồn tại.");
        }

        if (dto.Status == "Cancelled")
        {
            if (incident.Status != "PendingApproval")
                throw new Exception("Chỉ được hủy báo cáo đang chờ duyệt.");

            if (string.IsNullOrWhiteSpace(dto.RejectReason))
                throw new Exception("Vui lòng nhập lý do hủy.");
        }

        incident.Title = dto.Title;
        incident.Description = dto.Description;
        incident.BranchId = dto.BranchId;
        incident.EquipmentId = dto.EquipmentId;
        incident.Status = dto.Status;
        incident.RejectReason = dto.Status == "Cancelled"
            ? dto.RejectReason
            : null;

        incident.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(int incidentId)
    {
        var incident = await _db.Incidents
            .FirstOrDefaultAsync(x => x.IncidentId == incidentId);

        if (incident == null)
            throw new Exception("Không tìm thấy báo cáo.");

        // Chỉ cho phép xóa khi chưa duyệt
        if (incident.Status != "PendingApproval")
            throw new Exception("Chỉ được xóa báo cáo đang chờ duyệt.");

        var medias = await _db.IncidentMedias
            .Where(x => x.IncidentId == incidentId)
            .ToListAsync();

        // Xóa file trên S3
        foreach (var media in medias)
        {
            await _storage.DeleteFileAsync(media.MediaUrl);
        }

        _db.IncidentMedias.RemoveRange(medias);

        _db.Incidents.Remove(incident);

        await _db.SaveChangesAsync();
    }
}