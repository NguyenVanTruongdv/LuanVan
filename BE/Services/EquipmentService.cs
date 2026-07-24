using BE.Data; // TODO: sửa namespace DbContext nếu khác
using BE.DTOs.Equipment;
using BE.Models;
// using BE.Enums; // TODO: using đúng namespace enum EqmEnumStatus
using BE.Services.Storage;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace BE.Services
{
    public class EquipmentService
    {
        private const string ImageFolder = "equipments";

        private const string RoleAdmin = "Admin";
        private const string RoleManager = "Manager";
        private const string RoleStaff = "Staff";
        private const string RoleGuest = "Guest"; // không đăng nhập

        // Map với bảng `roles` trong DB: 1 = Staff, 2 = Manager, 3 = Admin
        private const int RoleIdStaff = 1;
        private const int RoleIdManager = 2;
        private const int RoleIdAdmin = 3;

        private readonly GymManagementContext _context; // TODO: sửa tên DbContext nếu khác
        private readonly S3StorageService _fileStorageService;

        public EquipmentService(GymManagementContext context, S3StorageService fileStorageService)
        {
            _context = context;
            _fileStorageService = fileStorageService;
        }

        /// <summary>
        /// Khách + Admin: xem full, lọc tự do theo name/category/branch.
        /// Manager: chỉ xem thiết bị của các chi nhánh mình quản lý, branchId trong filter bị bỏ qua.
        /// </summary>
        public async Task<List<EquipmentDto>> GetListAsync(EquipmentFilterDto filter, long? currentEmployeeId)
        {
            var (role, managedBranchIds) = await ResolveContextAsync(currentEmployeeId);

            var query = _context.Equipment
                .Include(e => e.Category)
                .Include(e => e.Branch)
                .AsQueryable();

            if (!filter.IncludeDeleted)
            {
                query = query.Where(e => e.Status != EqmEnumStatus.Deleted.ToString());
            }

            if (role == RoleManager)
            {
                query = query.Where(e => managedBranchIds.Contains(e.BranchId));
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
                var keyword = filter.Name.Trim();
                query = query.Where(e => EF.Functions.Like(e.EquipmentName, $"%{keyword}%"));
            }

            var equipments = await query
                .OrderByDescending(e => e.AddedAt)
                .ToListAsync();

            return equipments.Select(MapToDto).ToList();
        }

        /// <summary>
        /// Khách + Admin xem được mọi thiết bị. Manager chỉ xem chi nhánh mình quản lý.
        /// </summary>
        public async Task<EquipmentDto?> GetByIdAsync(int equipmentId, long? currentEmployeeId)
        {
            var (role, managedBranchIds) = await ResolveContextAsync(currentEmployeeId);

            var equipment = await _context.Equipment
                .Include(e => e.Category)
                .Include(e => e.Branch)
                .FirstOrDefaultAsync(e => e.EquipmentId == equipmentId);

            if (equipment == null)
            {
                return null;
            }

            if (role == RoleManager && !managedBranchIds.Contains(equipment.BranchId))
            {
                throw new UnauthorizedAccessException("Bạn không có quyền xem thiết bị của chi nhánh khác");
            }

            return MapToDto(equipment);
        }

        /// <summary>
        /// Thêm mới thiết bị. Admin: branchId tự do (vẫn phải hợp lệ). 
        /// Manager: branchId phải nằm trong danh sách chi nhánh mình quản lý.
        /// </summary>
        public async Task<EquipmentDto> CreateAsync(CreateEquipmentDto dto, long currentEmployeeId)
        {
            var (role, managedBranchIds) = await ResolveContextAsync(currentEmployeeId);

            if (role == RoleManager)
            {
                if (managedBranchIds.Count == 0)
                {
                    throw new UnauthorizedAccessException("Tài khoản manager chưa được gán chi nhánh quản lý");
                }
                if (!managedBranchIds.Contains(dto.BranchId))
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền thêm thiết bị cho chi nhánh này");
                }
            }
            else if (role != RoleAdmin)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền thêm thiết bị");
            }

            var categoryExists = await _context.EquipmentCategories.AnyAsync(c => c.CategoryId == dto.CategoryId);
            if (!categoryExists)
            {
                throw new InvalidOperationException($"Danh mục thiết bị với id {dto.CategoryId} không tồn tại");
            }

            // Admin cũng phải qua bước kiểm tra branchId hợp lệ này, không được miễn trừ
            await EnsureBranchValidAsync(dto.BranchId);

            var equipment = new Equipment
            {
                EquipmentName = dto.EquipmentName,
                CategoryId = dto.CategoryId,
                BranchId = dto.BranchId,
                Description = dto.Description,
                Status = EqmEnumStatus.Active.ToString(),
                AddedAt = DateTime.UtcNow
            };

            if (dto.Image is { Length: > 0 })
            {
                equipment.ImageUrl = await _fileStorageService.UploadFileAsync(dto.Image, ImageFolder);
            }

            _context.Equipment.Add(equipment);
            await _context.SaveChangesAsync();

            return (await GetByIdAsync(equipment.EquipmentId, currentEmployeeId))!;
        }

        /// <summary>
        /// Sửa thiết bị. Manager chỉ sửa được thiết bị thuộc chi nhánh mình quản lý,
        /// và chỉ được chuyển sang chi nhánh khác nếu chi nhánh đó cũng do mình quản lý.
        /// </summary>
        public async Task<bool> UpdateAsync(int equipmentId, UpdateEquipmentDto dto, long currentEmployeeId)
        {
            var (role, managedBranchIds) = await ResolveContextAsync(currentEmployeeId);

            var equipment = await _context.Equipment
                .FirstOrDefaultAsync(e => e.EquipmentId == equipmentId && e.Status != EqmEnumStatus.Deleted.ToString());

            if (equipment == null)
            {
                return false;
            }

            if (role == RoleManager)
            {
                if (!managedBranchIds.Contains(equipment.BranchId))
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền chỉnh sửa thiết bị của chi nhánh khác");
                }
                if (dto.BranchId.HasValue && !managedBranchIds.Contains(dto.BranchId.Value))
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền chuyển thiết bị sang chi nhánh mình không quản lý");
                }
            }
            else if (role != RoleAdmin)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền sửa thiết bị");
            }

            if (!string.IsNullOrWhiteSpace(dto.EquipmentName))
            {
                equipment.EquipmentName = dto.EquipmentName;
            }

            if (dto.CategoryId.HasValue)
            {
                var categoryExists = await _context.EquipmentCategories.AnyAsync(c => c.CategoryId == dto.CategoryId.Value);
                if (!categoryExists)
                {
                    throw new InvalidOperationException($"Danh mục thiết bị với id {dto.CategoryId} không tồn tại");
                }
                equipment.CategoryId = dto.CategoryId.Value;
            }

            if (dto.BranchId.HasValue)
            {
                // Manager đã bị chặn ở trên nếu branchId ngoài phạm vi quản lý; Admin vẫn phải qua validate tồn tại/active
                await EnsureBranchValidAsync(dto.BranchId.Value);
                equipment.BranchId = dto.BranchId.Value;
            }

            if (dto.Description != null)
            {
                equipment.Description = dto.Description;
            }

            // Chỉ đụng vào ảnh khi có truyền ảnh mới lên. Không truyền (null) => giữ nguyên ảnh cũ.
            if (dto.Image is { Length: > 0 })
            {
                // Xoá ảnh cũ trên storage (nếu có) trước khi thay bằng ảnh mới
                if (!string.IsNullOrWhiteSpace(equipment.ImageUrl))
                {
                    // DeleteFileAsync tự nuốt lỗi bên trong nên không cần try/catch ở đây
                    await _fileStorageService.DeleteFileAsync(equipment.ImageUrl);
                }

                equipment.ImageUrl = await _fileStorageService.UploadFileAsync(dto.Image, ImageFolder);
            }

            await _context.SaveChangesAsync();

            return true;
        }

        /// <summary>
        /// Đổi status thiết bị (Hide -> Deleted, Activate -> Active).
        /// Manager chỉ thao tác được thiết bị thuộc chi nhánh mình quản lý.
        /// </summary>
        public async Task<bool> SetStatusAsync(int equipmentId, string status, long currentEmployeeId)
        {
            var (role, managedBranchIds) = await ResolveContextAsync(currentEmployeeId);

            var equipment = await _context.Equipment.FirstOrDefaultAsync(e => e.EquipmentId == equipmentId);
            if (equipment == null)
            {
                return false;
            }

            if (role == RoleManager && !managedBranchIds.Contains(equipment.BranchId))
            {
                throw new UnauthorizedAccessException("Bạn không có quyền thao tác với thiết bị của chi nhánh khác");
            }
            if (role != RoleManager && role != RoleAdmin)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền thao tác với thiết bị");
            }

            var deletedStatus = EqmEnumStatus.Deleted.ToString();
            var activeStatus = EqmEnumStatus.Active.ToString();

            if (status == deletedStatus && equipment.Status == deletedStatus)
            {
                return false; // đã ẩn từ trước
            }

            if (status == activeStatus && equipment.Status != deletedStatus)
            {
                return false; // chưa từng bị ẩn thì không cần activate
            }

            equipment.Status = status;
            await _context.SaveChangesAsync();

            return true;
        }

        /// <summary>
        /// Validate branchId hợp lệ — dùng chung cho mọi role, kể cả Admin.
        /// TODO: nếu entity Branch của bạn không có field trạng thái, bỏ điều kiện Status bên dưới.
        /// </summary>
        private async Task EnsureBranchValidAsync(int branchId)
        {
            var branch = await _context.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.BranchId == branchId);

            if (branch == null)
            {
                throw new InvalidOperationException($"Chi nhánh với id {branchId} không tồn tại");
            }

            // TODO: đổi cho khớp field/giá trị trạng thái Branch thật của bạn (nếu có)
            if (branch.Status == "Deleted")
            {
                throw new InvalidOperationException($"Chi nhánh với id {branchId} đã ngừng hoạt động, không thể gán thiết bị");
            }
        }

        /// <summary>
        /// Tra role hệ thống (Employee.Role - int, map với bảng roles: 1=Staff, 2=Manager, 3=Admin)
        /// + danh sách chi nhánh mà employee đang quản lý (qua EmployeeBranch.BranchRole == "Manager").
        /// currentEmployeeId == null => Khách (không đăng nhập).
        /// </summary>
        private async Task<(string Role, List<int> ManagedBranchIds)> ResolveContextAsync(long? currentEmployeeId)
        {
            if (currentEmployeeId == null)
            {
                return (RoleGuest, new List<int>());
            }

            var employee = await _context.Employees
                .AsNoTracking()
                .Where(e => e.EmployeeId == currentEmployeeId.Value)
                .Select(e => new { e.Role }) // e.Role là int (role_id trong bảng roles)
                .FirstOrDefaultAsync();

            if (employee == null)
            {
                throw new UnauthorizedAccessException("Không xác định được thông tin nhân viên hiện tại");
            }

            var role = MapRoleIdToName(employee.Role.RoleId);

            var managedBranchIds = new List<int>();

            if (role == RoleManager)
            {
                managedBranchIds = await _context.EmployeeBranches
                    .AsNoTracking()
                    .Where(eb => eb.EmployeeId == currentEmployeeId.Value && eb.BranchRole == RoleManager)
                    .Select(eb => eb.BranchId)
                    .ToListAsync();
            }

            return (role, managedBranchIds);
        }

        private static string MapRoleIdToName(int roleId) => roleId switch
        {
            RoleIdAdmin => RoleAdmin,
            RoleIdManager => RoleManager,
            RoleIdStaff => RoleStaff,
            _ => throw new UnauthorizedAccessException("Vai trò nhân viên không hợp lệ")
        };

        private static EquipmentDto MapToDto(Equipment e)
        {
            return new EquipmentDto
            {
                EquipmentId = e.EquipmentId,
                EquipmentName = e.EquipmentName,
                CategoryId = e.CategoryId,
                CategoryName = e.Category?.CategoryName,
                BranchId = e.BranchId,
                BranchName = e.Branch?.BranchName,
                Status = e.Status,
                Description = e.Description,
                AddedAt = e.AddedAt,
                ImageUrl = e.ImageUrl
            };
        }
    }
}