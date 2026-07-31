using BE.Data;
using BE.DTOs.Equipment;
using BE.Models;
// using BE.Enums;
using BE.Services.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{

    public class ThongTinNhanVien
    {
        public int Role;
        public List<int> DsChiNhanhQuanLy = new List<int>();
    }

    public class EquipmentService
    {
        private const string FolderAnh = "equipments";

        private const int ROLE_GUEST = 0;
        private const int ROLE_STAFF = 1;
        private const int ROLE_MANAGER = 2;
        private const int ROLE_ADMIN = 3;

        private readonly GymManagementContext _context; // TODO: sửa tên DbContext nếu khác
        private readonly S3StorageService _fileStorageService;

        public EquipmentService(GymManagementContext context, S3StorageService fileStorageService)
        {
            _context = context;
            _fileStorageService = fileStorageService;
        }


        public async Task<List<EquipmentDto>> GetListAsync(EquipmentFilterDto filter, long? currentEmployeeId)
        {
            ThongTinNhanVien nhanVien = await GetEmployeeContextAsync(currentEmployeeId);

            var query = _context.Equipment
                .Include(e => e.Category)
                .Include(e => e.Branch)
                .AsQueryable();

            if (!filter.IncludeDeleted)
            {
                string trangThaiDaXoa = EqmEnumStatus.Deleted.ToString();
                query = query.Where(e => e.Status != trangThaiDaXoa);
            }

            if (nhanVien.Role == ROLE_MANAGER)
            {
                // Manager chỉ được xem chi nhánh mình quản lý, không quan tâm filter.BranchId
                query = query.Where(e => nhanVien.DsChiNhanhQuanLy.Contains(e.BranchId));
            }
            else if (filter.BranchId.HasValue)
            {
                query = query.Where(e => e.BranchId == filter.BranchId.Value);
            }

            if (filter.CategoryId.HasValue)
            {
                query = query.Where(e => e.CategoryId == filter.CategoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Name))
            {
                string tuKhoa = filter.Name.Trim();
                query = query.Where(e => EF.Functions.Like(e.EquipmentName, "%" + tuKhoa + "%"));
            }

            List<Equipment> dsThietBi = await query
                .OrderByDescending(e => e.AddedAt)
                .ToListAsync();

            List<EquipmentDto> ketQua = new List<EquipmentDto>();
            foreach (Equipment tb in dsThietBi)
            {
                ketQua.Add(MapToDto(tb));
            }
            return ketQua;
        }

        public async Task<EquipmentDto?> GetByIdAsync(int equipmentId, long? currentEmployeeId)
        {
            ThongTinNhanVien nhanVien = await GetEmployeeContextAsync(currentEmployeeId);

            Equipment? thietBi = await _context.Equipment
                .Include(e => e.Category)
                .Include(e => e.Branch)
                .FirstOrDefaultAsync(e => e.EquipmentId == equipmentId);

            if (thietBi == null)
            {
                return null;
            }

            if (nhanVien.Role == ROLE_MANAGER && !nhanVien.DsChiNhanhQuanLy.Contains(thietBi.BranchId))
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem thiết bị của chi nhánh khác");
            }

            return MapToDto(thietBi);
        }


        public async Task<EquipmentDto> CreateAsync(CreateEquipmentDto dto, long currentEmployeeId)
        {
            ThongTinNhanVien nhanVien = await GetEmployeeContextAsync(currentEmployeeId);

            if (nhanVien.Role == ROLE_MANAGER)
            {
                if (nhanVien.DsChiNhanhQuanLy.Count == 0)
                {
                    throw new UnauthorizedAccessException("Tài khoản manager chưa được gán chi nhánh quản lý");
                }
                if (!nhanVien.DsChiNhanhQuanLy.Contains(dto.BranchId))
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thêm thiết bị cho chi nhánh này");
                }
            }
            else if (nhanVien.Role != ROLE_ADMIN)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền thêm thiết bị");
            }

            bool danhMucTonTai = await _context.EquipmentCategories.AnyAsync(c => c.CategoryId == dto.CategoryId);
            if (!danhMucTonTai)
            {
                throw new InvalidOperationException("Danh mục thiết bị với id " + dto.CategoryId + " không tồn tại");
            }

            // Admin cũng phải qua bước kiểm tra branchId hợp lệ này, không được miễn trừ
            await EnsureBranchValidAsync(dto.BranchId);

            Equipment thietBiMoi = new Equipment();
            thietBiMoi.EquipmentName = dto.EquipmentName;
            thietBiMoi.CategoryId = dto.CategoryId;
            thietBiMoi.BranchId = dto.BranchId;
            thietBiMoi.Description = dto.Description;
            thietBiMoi.Status = EqmEnumStatus.Active.ToString();
            thietBiMoi.AddedAt = DateTime.UtcNow;

            if (dto.Image != null && dto.Image.Length > 0)
            {
                thietBiMoi.ImageUrl = await _fileStorageService.UploadFileAsync(dto.Image, FolderAnh);
            }

            _context.Equipment.Add(thietBiMoi);
            await _context.SaveChangesAsync();

            EquipmentDto? dtoVuaTao = await GetByIdAsync(thietBiMoi.EquipmentId, currentEmployeeId);
            return dtoVuaTao!;
        }

        // Sửa thiết bị. Manager chỉ sửa được thiết bị thuộc chi nhánh mình quản lý,
        // và chỉ được chuyển sang chi nhánh khác nếu chi nhánh đó cũng do mình quản lý.
        public async Task<bool> UpdateAsync(int equipmentId, UpdateEquipmentDto dto, long currentEmployeeId)
        {
            ThongTinNhanVien nhanVien = await GetEmployeeContextAsync(currentEmployeeId);

            string trangThaiDaXoa = EqmEnumStatus.Deleted.ToString();

            Equipment? thietBi = await _context.Equipment
                .FirstOrDefaultAsync(e => e.EquipmentId == equipmentId && e.Status != trangThaiDaXoa);

            if (thietBi == null)
            {
                return false;
            }

            if (nhanVien.Role == ROLE_MANAGER)
            {
                if (!nhanVien.DsChiNhanhQuanLy.Contains(thietBi.BranchId))
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa thiết bị của chi nhánh khác");
                }
                if (dto.BranchId.HasValue && !nhanVien.DsChiNhanhQuanLy.Contains(dto.BranchId.Value))
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền chuyển thiết bị sang chi nhánh mình không quản lý");
                }
            }
            else if (nhanVien.Role != ROLE_ADMIN)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền sửa thiết bị");
            }

            if (!string.IsNullOrWhiteSpace(dto.EquipmentName))
            {
                thietBi.EquipmentName = dto.EquipmentName;
            }

            if (dto.CategoryId.HasValue)
            {
                bool danhMucTonTai = await _context.EquipmentCategories.AnyAsync(c => c.CategoryId == dto.CategoryId.Value);
                if (!danhMucTonTai)
                {
                    throw new InvalidOperationException("Danh mục thiết bị với id " + dto.CategoryId + " không tồn tại");
                }
                thietBi.CategoryId = dto.CategoryId.Value;
            }

            if (dto.BranchId.HasValue)
            {
                // Manager đã bị chặn ở trên nếu branchId ngoài phạm vi quản lý; Admin vẫn phải qua validate tồn tại/active
                await EnsureBranchValidAsync(dto.BranchId.Value);
                thietBi.BranchId = dto.BranchId.Value;
            }

            if (dto.Description != null)
            {
                thietBi.Description = dto.Description;
            }

            // Chỉ đụng vào ảnh khi có truyền ảnh mới lên. Không truyền (null) => giữ nguyên ảnh cũ.
            if (dto.Image != null && dto.Image.Length > 0)
            {
                if (!string.IsNullOrWhiteSpace(thietBi.ImageUrl))
                {
                    // DeleteFileAsync tự nuốt lỗi bên trong nên không cần try/catch ở đây
                    await _fileStorageService.DeleteFileAsync(thietBi.ImageUrl);
                }

                thietBi.ImageUrl = await _fileStorageService.UploadFileAsync(dto.Image, FolderAnh);
            }

            await _context.SaveChangesAsync();

            return true;
        }

        // Đổi status thiết bị (Hide -> Deleted, Activate -> Active).
        // Manager chỉ thao tác được thiết bị thuộc chi nhánh mình quản lý.
        public async Task<bool> SetStatusAsync(int equipmentId, string status, long currentEmployeeId)
        {
            ThongTinNhanVien nhanVien = await GetEmployeeContextAsync(currentEmployeeId);

            Equipment? thietBi = await _context.Equipment.FirstOrDefaultAsync(e => e.EquipmentId == equipmentId);
            if (thietBi == null)
            {
                return false;
            }

            if (nhanVien.Role == ROLE_MANAGER && !nhanVien.DsChiNhanhQuanLy.Contains(thietBi.BranchId))
            {
                throw new UnauthorizedAccessException("Bạn không có quyền thao tác với thiết bị của chi nhánh khác");
            }
            if (nhanVien.Role != ROLE_MANAGER && nhanVien.Role != ROLE_ADMIN)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền thao tác với thiết bị");
            }

            string trangThaiDaXoa = EqmEnumStatus.Deleted.ToString();
            string trangThaiActive = EqmEnumStatus.Active.ToString();

            if (status == trangThaiDaXoa && thietBi.Status == trangThaiDaXoa)
            {
                return false; // đã ẩn từ trước
            }

            if (status == trangThaiActive && thietBi.Status != trangThaiDaXoa)
            {
                return false; // chưa từng bị ẩn thì không cần activate
            }

            thietBi.Status = status;
            await _context.SaveChangesAsync();

            return true;
        }

        // Kiểm tra branchId hợp lệ — dùng chung cho mọi role, kể cả Admin.
        // TODO: nếu entity Branch của bạn không có field trạng thái, bỏ điều kiện Status bên dưới.
        private async Task EnsureBranchValidAsync(int branchId)
        {
            Branch? chiNhanh = await _context.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.BranchId == branchId);

            if (chiNhanh == null)
            {
                throw new InvalidOperationException("Chi nhánh với id " + branchId + " không tồn tại");
            }

            // TODO: đổi cho khớp field/giá trị trạng thái Branch thật của bạn (nếu có)
            if (chiNhanh.Status == "Deleted")
            {
                throw new InvalidOperationException("Chi nhánh với id " + branchId + " đã ngừng hoạt động, không thể gán thiết bị");
            }
        }


        private async Task<ThongTinNhanVien> GetEmployeeContextAsync(long? currentEmployeeId)
        {
            ThongTinNhanVien ketQua = new ThongTinNhanVien();

            // Không đăng nhập => là khách
            if (currentEmployeeId == null)
            {
                ketQua.Role = ROLE_GUEST;
                return ketQua;
            }

            var nhanVien = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId.Value)
                .Select(e => new { e.Role }) // e.Role là int (role_id trong bảng roles)
                .FirstOrDefaultAsync();

            if (nhanVien == null)
            {
                throw new UnauthorizedAccessException("Không xác định được thông tin nhân viên hiện tại");
            }

            int role = nhanVien.Role.RoleId;

            if (role != ROLE_STAFF && role != ROLE_MANAGER && role != ROLE_ADMIN)
            {
                throw new UnauthorizedAccessException("Vai trò nhân viên không hợp lệ");
            }

            ketQua.Role = role;

            // Chỉ Manager mới cần lấy danh sách chi nhánh quản lý
            if (role == ROLE_MANAGER)
            {
                ketQua.DsChiNhanhQuanLy = await _context.Employees
                    .AsNoTracking()
                    .Where(e => e.EmployeeId == currentEmployeeId.Value)
                    .SelectMany(e => e.Branches)
                    .Select(b => b.BranchId)
                    .ToListAsync();
            }

            return ketQua;
        }

        // Chuyển Entity Equipment sang Dto để trả về cho client
        private static EquipmentDto MapToDto(Equipment tb)
        {
            EquipmentDto dto = new EquipmentDto();
            dto.EquipmentId = tb.EquipmentId;
            dto.EquipmentName = tb.EquipmentName;
            dto.CategoryId = tb.CategoryId;
            dto.CategoryName = tb.Category != null ? tb.Category.CategoryName : null;
            dto.BranchId = tb.BranchId;
            dto.BranchName = tb.Branch != null ? tb.Branch.BranchName : null;
            dto.Status = tb.Status;
            dto.Description = tb.Description;
            dto.AddedAt = tb.AddedAt;
            dto.ImageUrl = tb.ImageUrl;
            return dto;
        }
    }
}