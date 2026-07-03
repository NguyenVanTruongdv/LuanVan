using System;
using System.Collections.Generic;
using BE.Models;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;

namespace BE.Data;

public partial class GymManagementContext : DbContext
{
    public GymManagementContext()
    {
    }

    public GymManagementContext(DbContextOptions<GymManagementContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AccountLockLog> AccountLockLogs { get; set; }

    public virtual DbSet<Branch> Branches { get; set; }

    public virtual DbSet<BranchImage> BranchImages { get; set; }

    public virtual DbSet<CheckIn> CheckIns { get; set; }

    public virtual DbSet<Employee> Employees { get; set; }

    public virtual DbSet<Equipment> Equipment { get; set; }

    public virtual DbSet<EquipmentCategory> EquipmentCategories { get; set; }

    public virtual DbSet<EquipmentImage> EquipmentImages { get; set; }

    public virtual DbSet<FaceDatum> FaceData { get; set; }

    public virtual DbSet<FaceUpdateHistory> FaceUpdateHistories { get; set; }

    public virtual DbSet<ForumComment> ForumComments { get; set; }

    public virtual DbSet<ForumLike> ForumLikes { get; set; }

    public virtual DbSet<ForumNotification> ForumNotifications { get; set; }

    public virtual DbSet<ForumPost> ForumPosts { get; set; }

    public virtual DbSet<ForumPostImage> ForumPostImages { get; set; }

    public virtual DbSet<GymDensity> GymDensities { get; set; }

    public virtual DbSet<HomeImage> HomeImages { get; set; }

    public virtual DbSet<Incident> Incidents { get; set; }

    public virtual DbSet<Member> Members { get; set; }

    public virtual DbSet<MemberPackage> MemberPackages { get; set; }

    public virtual DbSet<MemberUpdateLog> MemberUpdateLogs { get; set; }

    public virtual DbSet<MembershipPlan> MembershipPlans { get; set; }

    public virtual DbSet<News> News { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Otp> Otps { get; set; }

    public virtual DbSet<Promotion> Promotions { get; set; }

    public virtual DbSet<PromotionPlan> PromotionPlans { get; set; }

    public virtual DbSet<PromotionUsage> PromotionUsages { get; set; }

    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Transaction> Transactions { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseMySql("server=localhost;database=Gym_Management;user=root", Microsoft.EntityFrameworkCore.ServerVersion.Parse("9.1.0-mysql"));

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_unicode_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<AccountLockLog>(entity =>
        {
            entity.HasKey(e => e.LogId).HasName("PRIMARY");

            entity.ToTable("account_lock_log", tb => tb.HasComment("Lịch sử khóa/mở tài khoản hội viên và nhân viên — chỉ ghi thêm"));

            entity.HasIndex(e => e.MemberId, "fk_kl_hv");

            entity.HasIndex(e => e.PerformedBy, "fk_kl_nv");

            entity.HasIndex(e => e.EmployeeId, "fk_kl_nv_target");

            entity.Property(e => e.LogId)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("log_id");
            entity.Property(e => e.Action)
                .HasComment("Hành động thực hiện: Lock = khóa tài khoản, Unlock = mở khóa tài khoản")
                .HasColumnType("enum('Lock','Unlock')")
                .HasColumnName("action");
            entity.Property(e => e.EmployeeId)
                .HasComment("Nhân viên bị tác động — FK tới employees.employee_id. Điền khi khóa/mở tài khoản nhân viên, NULL nếu là hội viên")
                .HasColumnName("employee_id");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên bị tác động — FK tới members.member_id. Điền khi khóa/mở tài khoản hội viên, NULL nếu là nhân viên")
                .HasColumnName("member_id");
            entity.Property(e => e.PerformedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm thực hiện")
                .HasColumnType("datetime")
                .HasColumnName("performed_at");
            entity.Property(e => e.PerformedBy)
                .HasComment("Nhân viên thực hiện thao tác — FK tới employees.employee_id")
                .HasColumnName("performed_by");
            entity.Property(e => e.Reason)
                .HasComment("Lý do khóa hoặc mở khóa tài khoản")
                .HasColumnType("text")
                .HasColumnName("reason");

            entity.HasOne(d => d.Employee).WithMany(p => p.AccountLockLogEmployees)
                .HasForeignKey(d => d.EmployeeId)
                .HasConstraintName("fk_kl_nv_target");

            entity.HasOne(d => d.Member).WithMany(p => p.AccountLockLogs)
                .HasForeignKey(d => d.MemberId)
                .HasConstraintName("fk_kl_hv");

            entity.HasOne(d => d.PerformedByNavigation).WithMany(p => p.AccountLockLogPerformedByNavigations)
                .HasForeignKey(d => d.PerformedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_kl_nv");
        });

        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(e => e.BranchId).HasName("PRIMARY");

            entity.ToTable("branches", tb => tb.HasComment("Chi nhánh phòng gym"));

            entity.HasIndex(e => e.ManagerId, "fk_branch_manager");

            entity.Property(e => e.BranchId)
                .HasComment("Mã chi nhánh — khóa chính tự tăng")
                .HasColumnName("branch_id");
            entity.Property(e => e.Address)
                .HasComment("Địa chỉ đầy đủ của chi nhánh")
                .HasColumnType("text")
                .HasColumnName("address");
            entity.Property(e => e.BranchName)
                .HasMaxLength(150)
                .HasComment("Tên hiển thị của chi nhánh")
                .HasColumnName("branch_name");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm thêm chi nhánh vào hệ thống")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ManagerId)
                .HasComment("Quản lý phụ trách chi nhánh — FK tới employees.employee_id")
                .HasColumnName("manager_id");
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .HasComment("Số điện thoại liên hệ của chi nhánh, có thể NULL")
                .HasColumnName("phone");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasComment("Trạng thái hoạt động: Active = đang mở, Inactive = đã đóng")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");

            entity.HasOne(d => d.Manager).WithMany(p => p.Branches)
                .HasForeignKey(d => d.ManagerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_branch_manager");
        });

        modelBuilder.Entity<BranchImage>(entity =>
        {
            entity.HasKey(e => e.ImageId).HasName("PRIMARY");

            entity.ToTable("branch_images", tb => tb.HasComment("Album ảnh các khu vực của từng chi nhánh — chỉ Admin quản lý"));

            entity.HasIndex(e => e.BranchId, "idx_anh_cn");

            entity.Property(e => e.ImageId)
                .HasComment("Mã ảnh — khóa chính tự tăng")
                .HasColumnName("image_id");
            entity.Property(e => e.BranchId)
                .HasComment("Chi nhánh sở hữu ảnh — FK tới branches.branch_id")
                .HasColumnName("branch_id");
            entity.Property(e => e.ImageType)
                .HasMaxLength(100)
                .HasComment("Khu vực trong ảnh, VD: Lễ tân, Phòng tập, Phòng thay đồ, Hồ bơi")
                .HasColumnName("image_type");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasComment("URL ảnh lưu trên S3")
                .HasColumnName("image_url");
            entity.Property(e => e.SortOrder)
                .HasComment("Thứ tự hiển thị trong cùng image_type, số nhỏ hiển thị trước")
                .HasColumnName("sort_order");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tải ảnh lên")
                .HasColumnType("datetime")
                .HasColumnName("uploaded_at");

            entity.HasOne(d => d.Branch).WithMany(p => p.BranchImages)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_anh_cn");
        });

        modelBuilder.Entity<CheckIn>(entity =>
        {
            entity.HasKey(e => e.CheckInId).HasName("PRIMARY");

            entity.ToTable("check_ins", tb => tb.HasComment("Lịch sử check-in và check-out của hội viên tại các chi nhánh"));

            entity.HasIndex(e => e.BranchId, "fk_checkin_cn");

            entity.HasIndex(e => e.MemberId, "fk_checkin_hv");

            entity.HasIndex(e => e.StaffId, "fk_checkin_nv");

            entity.HasIndex(e => e.MemberPackageId, "fk_checkin_package");

            entity.HasIndex(e => e.CheckOutStaffId, "fk_checkout_nv");

            entity.Property(e => e.CheckInId)
                .HasComment("Mã lần check-in — khóa chính tự tăng")
                .HasColumnName("check_in_id");
            entity.Property(e => e.BranchId)
                .HasComment("Chi nhánh hội viên vào tập — FK tới branches.branch_id")
                .HasColumnName("branch_id");
            entity.Property(e => e.CheckInTime)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm hội viên vào tập")
                .HasColumnType("datetime")
                .HasColumnName("check_in_time");
            entity.Property(e => e.CheckOutManualReason)
                .HasComment("Lý do check out thủ công. Bắt buộc khi check_out_method = Manual")
                .HasColumnType("text")
                .HasColumnName("check_out_manual_reason");
            entity.Property(e => e.CheckOutMethod)
                .HasComment("Phương thức check out: Auto = nhận diện khuôn mặt tự động, Manual = nhân viên thực hiện thủ công. NULL nếu chưa check out")
                .HasColumnType("enum('Auto','Manual')")
                .HasColumnName("check_out_method");
            entity.Property(e => e.CheckOutStaffId)
                .HasComment("Nhân viên thực hiện check out thủ công — FK tới employees.employee_id. NULL nếu check_out_method = Auto hoặc chưa check out")
                .HasColumnName("check_out_staff_id");
            entity.Property(e => e.CheckOutTime)
                .HasComment("Thời điểm hội viên ra về. NULL = chưa check out")
                .HasColumnType("datetime")
                .HasColumnName("check_out_time");
            entity.Property(e => e.ManualReason)
                .HasComment("Lý do check in thủ công, VD: camera lỗi, hội viên chưa đăng ký khuôn mặt. Bắt buộc khi method = Manual")
                .HasColumnType("text")
                .HasColumnName("manual_reason");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên check in — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.MemberPackageId)
                .HasComment("Gói tập đang còn hiệu lực tại thời điểm check in — FK tới member_packages.member_package_id")
                .HasColumnName("member_package_id");
            entity.Property(e => e.Method)
                .HasComment("Phương thức check in: Auto = nhận diện khuôn mặt tự động, Manual = nhân viên thực hiện thủ công")
                .HasColumnType("enum('Auto','Manual')")
                .HasColumnName("method");
            entity.Property(e => e.StaffId)
                .HasComment("Nhân viên thực hiện check in thủ công — FK tới employees.employee_id. NULL nếu method = Auto")
                .HasColumnName("staff_id");

            entity.HasOne(d => d.Branch).WithMany(p => p.CheckIns)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_checkin_cn");

            entity.HasOne(d => d.CheckOutStaff).WithMany(p => p.CheckInCheckOutStaffs)
                .HasForeignKey(d => d.CheckOutStaffId)
                .HasConstraintName("fk_checkout_nv");

            entity.HasOne(d => d.Member).WithMany(p => p.CheckIns)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_checkin_hv");

            entity.HasOne(d => d.MemberPackage).WithMany(p => p.CheckIns)
                .HasForeignKey(d => d.MemberPackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_checkin_package");

            entity.HasOne(d => d.Staff).WithMany(p => p.CheckInStaffs)
                .HasForeignKey(d => d.StaffId)
                .HasConstraintName("fk_checkin_nv");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.EmployeeId).HasName("PRIMARY");

            entity.ToTable("employees", tb => tb.HasComment("Tài khoản nhân viên vận hành phòng gym"));

            entity.HasIndex(e => e.CreatedBy, "fk_employee_creator");

            entity.HasIndex(e => e.RoleId, "fk_employee_role");

            entity.HasIndex(e => e.Email, "uq_employee_email").IsUnique();

            entity.HasIndex(e => e.Phone, "uq_employee_phone").IsUnique();

            entity.Property(e => e.EmployeeId)
                .HasComment("Mã nhân viên — khóa chính tự tăng")
                .HasColumnName("employee_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo tài khoản")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Nhân viên tạo tài khoản này — FK tự tham chiếu, NULL cho tài khoản khởi tạo đầu tiên")
                .HasColumnName("created_by");
            entity.Property(e => e.Email)
                .HasMaxLength(150)
                .HasComment("Địa chỉ email của nhân viên, dùng để nhận thông báo/khôi phục mật khẩu, có thể NULL nhưng phải duy nhất nếu có")
                .HasColumnName("email");
            entity.Property(e => e.FullName)
                .HasMaxLength(100)
                .HasComment("Họ và tên đầy đủ của nhân viên")
                .HasColumnName("full_name");
            entity.Property(e => e.Gender)
                .HasComment("Giới tính của nhân viên")
                .HasColumnType("enum('Male','Female','Other')")
                .HasColumnName("gender");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasComment("Mật khẩu đã mã hóa bcrypt, không lưu bản rõ")
                .HasColumnName("password_hash");
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .HasComment("Số điện thoại — dùng làm tên đăng nhập, phải duy nhất")
                .HasColumnName("phone");
            entity.Property(e => e.RoleId)
                .HasComment("Vai trò của nhân viên — FK tới roles.role_id")
                .HasColumnName("role_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasComment("Trạng thái tài khoản: Active = đang hoạt động, Suspended = bị tạm khóa")
                .HasColumnType("enum('Active','Suspended')")
                .HasColumnName("status");
            entity.Property(e => e.SuspendReason)
                .HasComment("Lý do tạm khóa — bắt buộc điền khi status = Suspended")
                .HasColumnType("text")
                .HasColumnName("suspend_reason");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm cập nhật gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.InverseCreatedByNavigation)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("fk_employee_creator");

            entity.HasOne(d => d.Role).WithMany(p => p.Employees)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_employee_role");
        });

        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.HasKey(e => e.EquipmentId).HasName("PRIMARY");

            entity.ToTable("equipment", tb => tb.HasComment("Thiết bị tập luyện được lắp đặt tại các chi nhánh"));

            entity.HasIndex(e => e.BranchId, "fk_thietbi_chinhanh");

            entity.HasIndex(e => e.CategoryId, "fk_thietbi_danhmuc");

            entity.Property(e => e.EquipmentId)
                .HasComment("Mã thiết bị — khóa chính tự tăng")
                .HasColumnName("equipment_id");
            entity.Property(e => e.AddedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Ngày thiết bị được thêm vào hệ thống")
                .HasColumnType("datetime")
                .HasColumnName("added_at");
            entity.Property(e => e.BranchId)
                .HasComment("Chi nhánh đang đặt thiết bị — FK tới branches.branch_id")
                .HasColumnName("branch_id");
            entity.Property(e => e.CategoryId)
                .HasComment("Danh mục thiết bị — FK tới equipment_categories.category_id")
                .HasColumnName("category_id");
            entity.Property(e => e.Description)
                .HasComment("Mô tả thêm về thiết bị, VD: serial number, năm mua")
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.EquipmentName)
                .HasMaxLength(150)
                .HasComment("Tên thiết bị, VD: Máy chạy bộ TechnoGym Run 700")
                .HasColumnName("equipment_name");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasComment("Trạng thái: Active=đang hoạt động, Broken=bị hỏng, UnderMaintenance=đang sửa chữa")
                .HasColumnType("enum('Active','Broken','UnderMaintenance')")
                .HasColumnName("status");

            entity.HasOne(d => d.Branch).WithMany(p => p.Equipment)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_thietbi_chinhanh");

            entity.HasOne(d => d.Category).WithMany(p => p.Equipment)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_thietbi_danhmuc");
        });

        modelBuilder.Entity<EquipmentCategory>(entity =>
        {
            entity.HasKey(e => e.CategoryId).HasName("PRIMARY");

            entity.ToTable("equipment_categories", tb => tb.HasComment("Danh mục phân loại thiết bị tập luyện"));

            entity.HasIndex(e => e.CategoryName, "uq_ten_danh_muc").IsUnique();

            entity.Property(e => e.CategoryId)
                .HasComment("Mã danh mục — khóa chính tự tăng")
                .HasColumnName("category_id");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(100)
                .HasComment("Tên danh mục thiết bị, VD: Cardio, Tạ tự do, Máy tập")
                .HasColumnName("category_name");
            entity.Property(e => e.Description)
                .HasComment("Mô tả chi tiết về danh mục thiết bị")
                .HasColumnType("text")
                .HasColumnName("description");
        });

        modelBuilder.Entity<EquipmentImage>(entity =>
        {
            entity.HasKey(e => e.ImageId).HasName("PRIMARY");

            entity.ToTable("equipment_images", tb => tb.HasComment("Album ảnh của từng thiết bị"));

            entity.HasIndex(e => e.EquipmentId, "idx_anh_tb");

            entity.Property(e => e.ImageId)
                .HasComment("Mã ảnh — khóa chính tự tăng")
                .HasColumnName("image_id");
            entity.Property(e => e.EquipmentId)
                .HasComment("Thiết bị sở hữu ảnh — FK tới equipment.equipment_id")
                .HasColumnName("equipment_id");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasComment("URL ảnh lưu trên S3")
                .HasColumnName("image_url");
            entity.Property(e => e.SortOrder)
                .HasComment("Thứ tự hiển thị, số nhỏ hiển thị trước")
                .HasColumnName("sort_order");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tải ảnh lên")
                .HasColumnType("datetime")
                .HasColumnName("uploaded_at");

            entity.HasOne(d => d.Equipment).WithMany(p => p.EquipmentImages)
                .HasForeignKey(d => d.EquipmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_anh_tb");
        });

        modelBuilder.Entity<FaceDatum>(entity =>
        {
            entity.HasKey(e => e.FaceDataId).HasName("PRIMARY");

            entity.ToTable("face_data", tb => tb.HasComment("Dữ liệu nhận diện khuôn mặt hội viên liên kết với AWS Rekognition"));

            entity.HasIndex(e => e.CreatedBy, "fk_face_creator");

            entity.HasIndex(e => e.FaceIdAws, "uq_face_id_aws").IsUnique();

            entity.HasIndex(e => e.MemberId, "uq_face_member").IsUnique();

            entity.Property(e => e.FaceDataId)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("face_data_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm đăng ký khuôn mặt")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Nhân viên thực hiện đăng ký khuôn mặt — FK tới employees.employee_id")
                .HasColumnName("created_by");
            entity.Property(e => e.FaceIdAws)
                .HasMaxLength(100)
                .HasComment("Face ID do AWS Rekognition trả về sau khi đăng ký")
                .HasColumnName("face_id_aws");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên sở hữu khuôn mặt — FK tới members.member_id, quan hệ 1-1")
                .HasColumnName("member_id");
            entity.Property(e => e.ProfileImage)
                .HasMaxLength(500)
                .HasComment("URL ảnh đại diện lưu trên S3, có thể NULL")
                .HasColumnName("profile_image");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.FaceData)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_face_creator");

            entity.HasOne(d => d.Member).WithOne(p => p.FaceDatum)
                .HasForeignKey<FaceDatum>(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_face_member");
        });

        modelBuilder.Entity<FaceUpdateHistory>(entity =>
        {
            entity.HasKey(e => e.HistoryId).HasName("PRIMARY");

            entity.ToTable("face_update_history", tb => tb.HasComment("Lịch sử mỗi lần cập nhật khuôn mặt hội viên"));

            entity.HasIndex(e => e.MemberId, "fk_facehistory_member");

            entity.HasIndex(e => e.PerformedBy, "fk_facehistory_staff");

            entity.Property(e => e.HistoryId)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("history_id");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên được cập nhật khuôn mặt — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.NewFaceIdAws)
                .HasMaxLength(100)
                .HasComment("Face ID mới trên AWS sau khi cập nhật")
                .HasColumnName("new_face_id_aws");
            entity.Property(e => e.OldFaceIdAws)
                .HasMaxLength(100)
                .HasComment("Face ID cũ trên AWS — NULL nếu đây là lần đăng ký đầu tiên")
                .HasColumnName("old_face_id_aws");
            entity.Property(e => e.PerformedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm thực hiện thay đổi")
                .HasColumnType("datetime")
                .HasColumnName("performed_at");
            entity.Property(e => e.PerformedBy)
                .HasComment("Nhân viên thực hiện thao tác — FK tới employees.employee_id")
                .HasColumnName("performed_by");
            entity.Property(e => e.Reason)
                .HasComment("Lý do thay đổi khuôn mặt, VD: ảnh cũ không rõ, hội viên yêu cầu")
                .HasColumnType("text")
                .HasColumnName("reason");

            entity.HasOne(d => d.Member).WithMany(p => p.FaceUpdateHistories)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_facehistory_member");

            entity.HasOne(d => d.PerformedByNavigation).WithMany(p => p.FaceUpdateHistories)
                .HasForeignKey(d => d.PerformedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_facehistory_staff");
        });

        modelBuilder.Entity<ForumComment>(entity =>
        {
            entity.HasKey(e => e.CommentId).HasName("PRIMARY");

            entity.ToTable("forum_comments", tb => tb.HasComment("Bình luận trong bài đăng forum, hỗ trợ trả lời 1 cấp và @ đích danh người được trả lời"));

            entity.HasIndex(e => e.MemberId, "fk_comment_member");

            entity.HasIndex(e => e.ReplyToMemberId, "fk_comment_reply_to");

            entity.HasIndex(e => e.ParentCommentId, "idx_comment_parent");

            entity.HasIndex(e => new { e.PostId, e.CreatedAt }, "idx_comment_post");

            entity.Property(e => e.CommentId)
                .HasComment("Mã bình luận — khóa chính tự tăng")
                .HasColumnName("comment_id");
            entity.Property(e => e.Content)
                .HasComment("Nội dung bình luận")
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm bình luận")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên bình luận — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.ParentCommentId)
                .HasComment("Bình luận gốc của nhánh — FK tự tham chiếu tới forum_comments.comment_id, NULL nếu bản thân là bình luận gốc")
                .HasColumnName("parent_comment_id");
            entity.Property(e => e.PostId)
                .HasComment("Bài đăng được bình luận — FK tới forum_posts.post_id")
                .HasColumnName("post_id");
            entity.Property(e => e.ReplyToMemberId)
                .HasComment("Hội viên đang được trả lời đích danh — FK tới members.member_id. Bắt buộc điền khi là reply, NULL nếu là bình luận gốc")
                .HasColumnName("reply_to_member_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasComment("Trạng thái: Active=đang hiển thị, Deleted=đã xóa (soft delete)")
                .HasColumnType("enum('Active','Deleted')")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm chỉnh sửa gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Member).WithMany(p => p.ForumCommentMembers)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_comment_member");

            entity.HasOne(d => d.ParentComment).WithMany(p => p.InverseParentComment)
                .HasForeignKey(d => d.ParentCommentId)
                .HasConstraintName("fk_comment_parent");

            entity.HasOne(d => d.Post).WithMany(p => p.ForumComments)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("fk_comment_post");

            entity.HasOne(d => d.ReplyToMember).WithMany(p => p.ForumCommentReplyToMembers)
                .HasForeignKey(d => d.ReplyToMemberId)
                .HasConstraintName("fk_comment_reply_to");
        });

        modelBuilder.Entity<ForumLike>(entity =>
        {
            entity.HasKey(e => e.LikeId).HasName("PRIMARY");

            entity.ToTable("forum_likes", tb => tb.HasComment("Lượt tym (yêu thích) bài đăng forum của hội viên"));

            entity.HasIndex(e => e.MemberId, "idx_like_member");

            entity.HasIndex(e => new { e.PostId, e.MemberId }, "uq_like_post_member").IsUnique();

            entity.Property(e => e.LikeId)
                .HasComment("Mã lượt tym — khóa chính tự tăng")
                .HasColumnName("like_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tym")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên thực hiện tym — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.PostId)
                .HasComment("Bài đăng được tym — FK tới forum_posts.post_id")
                .HasColumnName("post_id");

            entity.HasOne(d => d.Member).WithMany(p => p.ForumLikes)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_like_member");

            entity.HasOne(d => d.Post).WithMany(p => p.ForumLikes)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("fk_like_post");
        });

        modelBuilder.Entity<ForumNotification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("PRIMARY");

            entity.ToTable("forum_notifications", tb => tb.HasComment("Thông báo cho hội viên khi bài viết của họ được tym hoặc bình luận"));

            entity.HasIndex(e => e.ActorMemberId, "fk_forumnotif_actor");

            entity.HasIndex(e => e.CommentId, "fk_forumnotif_comment");

            entity.HasIndex(e => e.PostId, "fk_forumnotif_post");

            entity.HasIndex(e => new { e.RecipientMemberId, e.IsRead, e.CreatedAt }, "idx_forumnotif_recipient");

            entity.Property(e => e.NotificationId)
                .HasComment("Mã thông báo — khóa chính tự tăng")
                .HasColumnName("notification_id");
            entity.Property(e => e.ActorMemberId)
                .HasComment("Hội viên thực hiện hành động (người tym/bình luận/trả lời) — FK tới members.member_id")
                .HasColumnName("actor_member_id");
            entity.Property(e => e.CommentId)
                .HasComment("Bình luận liên quan — FK tới forum_comments.comment_id. Bắt buộc điền khi notify_type = Comment, NULL khi notify_type = Like")
                .HasColumnName("comment_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm phát sinh thông báo")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.IsRead)
                .HasComment("0 = chưa đọc, 1 = đã đọc")
                .HasColumnName("is_read");
            entity.Property(e => e.NotifyType)
                .HasComment("Loại thông báo: Like=có người tym bài, Comment=có người bình luận bài, Reply=có người trả lời đích danh bình luận của mình")
                .HasColumnType("enum('Like','Comment','Reply')")
                .HasColumnName("notify_type");
            entity.Property(e => e.PostId)
                .HasComment("Bài đăng liên quan — FK tới forum_posts.post_id")
                .HasColumnName("post_id");
            entity.Property(e => e.RecipientMemberId)
                .HasComment("Hội viên nhận thông báo — FK tới members.member_id")
                .HasColumnName("recipient_member_id");

            entity.HasOne(d => d.ActorMember).WithMany(p => p.ForumNotificationActorMembers)
                .HasForeignKey(d => d.ActorMemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_forumnotif_actor");

            entity.HasOne(d => d.Comment).WithMany(p => p.ForumNotifications)
                .HasForeignKey(d => d.CommentId)
                .HasConstraintName("fk_forumnotif_comment");

            entity.HasOne(d => d.Post).WithMany(p => p.ForumNotifications)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("fk_forumnotif_post");

            entity.HasOne(d => d.RecipientMember).WithMany(p => p.ForumNotificationRecipientMembers)
                .HasForeignKey(d => d.RecipientMemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_forumnotif_recipient");
        });

        modelBuilder.Entity<ForumPost>(entity =>
        {
            entity.HasKey(e => e.PostId).HasName("PRIMARY");

            entity.ToTable("forum_posts", tb => tb.HasComment("Bài đăng trên forum của hội viên, gồm cả bài gốc và bài đăng lại"));

            entity.HasIndex(e => new { e.MemberId, e.Status, e.CreatedAt }, "idx_post_member");

            entity.HasIndex(e => e.OriginalPostId, "idx_post_original");

            entity.Property(e => e.PostId)
                .HasComment("Mã bài đăng — khóa chính tự tăng")
                .HasColumnName("post_id");
            entity.Property(e => e.CommentCount)
                .HasComment("Số lượt bình luận — đồng bộ mỗi khi forum_comments thay đổi")
                .HasColumnName("comment_count");
            entity.Property(e => e.Content)
                .HasComment("Nội dung bài viết. Có thể NULL nếu là Repost không kèm lời bình")
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm đăng bài")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.LikeCount)
                .HasComment("Số lượt tym — đồng bộ mỗi khi forum_likes thay đổi")
                .HasColumnName("like_count");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên tạo bài đăng — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.OriginalPostId)
                .HasComment("Bài viết gốc được đăng lại — FK tự tham chiếu tới forum_posts.post_id. Bắt buộc khi post_type = Repost, NULL khi Original")
                .HasColumnName("original_post_id");
            entity.Property(e => e.PostType)
                .HasDefaultValueSql("'Original'")
                .HasComment("Loại bài: Original = bài gốc, Repost = đăng lại bài của người khác")
                .HasColumnType("enum('Original','Repost')")
                .HasColumnName("post_type");
            entity.Property(e => e.RepostCount)
                .HasComment("Số lượt được đăng lại — đồng bộ mỗi khi có bài Repost mới trỏ tới bài này")
                .HasColumnName("repost_count");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasComment("Trạng thái: Active=đang hiển thị, Hidden=bị Admin ẩn do vi phạm, Deleted=hội viên tự xóa (soft delete)")
                .HasColumnType("enum('Active','Hidden','Deleted')")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm chỉnh sửa gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Member).WithMany(p => p.ForumPosts)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_post_member");

            entity.HasOne(d => d.OriginalPost).WithMany(p => p.InverseOriginalPost)
                .HasForeignKey(d => d.OriginalPostId)
                .HasConstraintName("fk_post_original");
        });

        modelBuilder.Entity<ForumPostImage>(entity =>
        {
            entity.HasKey(e => e.ImageId).HasName("PRIMARY");

            entity.ToTable("forum_post_images", tb => tb.HasComment("Ảnh đính kèm trong bài đăng forum, 1 bài có thể có nhiều ảnh"));

            entity.HasIndex(e => e.PostId, "idx_postimg_post");

            entity.Property(e => e.ImageId)
                .HasComment("Mã ảnh — khóa chính tự tăng")
                .HasColumnName("image_id");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasComment("URL ảnh lưu trên S3")
                .HasColumnName("image_url");
            entity.Property(e => e.PostId)
                .HasComment("Bài đăng sở hữu ảnh — FK tới forum_posts.post_id")
                .HasColumnName("post_id");
            entity.Property(e => e.SortOrder)
                .HasComment("Thứ tự hiển thị trong bài (ảnh 1, ảnh 2...), số nhỏ hiển thị trước")
                .HasColumnName("sort_order");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tải ảnh lên")
                .HasColumnType("datetime")
                .HasColumnName("uploaded_at");

            entity.HasOne(d => d.Post).WithMany(p => p.ForumPostImages)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("fk_postimg_post");
        });

        modelBuilder.Entity<GymDensity>(entity =>
        {
            entity.HasKey(e => e.DensityId).HasName("PRIMARY");

            entity.ToTable("gym_density", tb => tb.HasComment("Snapshot mật độ người tập theo thời gian — dữ liệu do job ngoài hoặc cảm biến ghi vào"));

            entity.HasIndex(e => new { e.BranchId, e.RecordedAt }, "idx_mat_do_cn_tg");

            entity.Property(e => e.DensityId)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("density_id");
            entity.Property(e => e.BranchId)
                .HasComment("Chi nhánh được ghi nhận — FK tới branches.branch_id")
                .HasColumnName("branch_id");
            entity.Property(e => e.Headcount)
                .HasComment("Số người đang có mặt tại chi nhánh tại thời điểm ghi nhận")
                .HasColumnName("headcount");
            entity.Property(e => e.RecordedAt)
                .HasComment("Thời điểm ghi nhận snapshot, VD: mỗi 15 phút job tự chạy")
                .HasColumnType("datetime")
                .HasColumnName("recorded_at");

            entity.HasOne(d => d.Branch).WithMany(p => p.GymDensities)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_md_cn");
        });

        modelBuilder.Entity<HomeImage>(entity =>
        {
            entity.HasKey(e => e.ImageId).HasName("PRIMARY");

            entity.ToTable("home_images", tb => tb.HasComment("Ảnh hiển thị trên trang chủ (banner/slideshow) — chỉ Admin quản lý"));

            entity.HasIndex(e => e.UploadedBy, "fk_home_img_nv");

            entity.Property(e => e.ImageId)
                .HasComment("Mã ảnh — khóa chính tự tăng")
                .HasColumnName("image_id");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasComment("URL ảnh lưu trên S3")
                .HasColumnName("image_url");
            entity.Property(e => e.LinkUrl)
                .HasMaxLength(500)
                .HasComment("Đường dẫn khi người dùng bấm vào ảnh (VD: liên kết tới gói tập, khuyến mãi), có thể NULL")
                .HasColumnName("link_url");
            entity.Property(e => e.SortOrder)
                .HasComment("Thứ tự hiển thị trên trang home, số nhỏ hiển thị trước")
                .HasColumnName("sort_order");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasComment("Trạng thái hiển thị: Active = đang hiện, Inactive = đang ẩn")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasComment("Tiêu đề/chú thích hiển thị kèm ảnh, có thể NULL")
                .HasColumnName("title");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tải ảnh lên")
                .HasColumnType("datetime")
                .HasColumnName("uploaded_at");
            entity.Property(e => e.UploadedBy)
                .HasComment("Nhân viên (Admin) tải ảnh lên — FK tới employees.employee_id")
                .HasColumnName("uploaded_by");

            entity.HasOne(d => d.UploadedByNavigation).WithMany(p => p.HomeImages)
                .HasForeignKey(d => d.UploadedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_home_img_nv");
        });

        modelBuilder.Entity<Incident>(entity =>
        {
            entity.HasKey(e => e.IncidentId).HasName("PRIMARY");

            entity.ToTable("incidents", tb => tb.HasComment("Báo cáo sự cố thiết bị/cơ sở vật chất — hội viên hoặc nhân viên đều có thể tạo"));

            entity.HasIndex(e => e.ApprovedBy, "fk_su_co_approved");

            entity.HasIndex(e => e.AssignedTo, "fk_su_co_assigned");

            entity.HasIndex(e => e.BranchId, "fk_su_co_cn");

            entity.HasIndex(e => e.ReportedByMemberId, "fk_su_co_hv");

            entity.HasIndex(e => e.ReportedByEmployeeId, "fk_su_co_nv");

            entity.HasIndex(e => e.EquipmentId, "fk_su_co_tb");

            entity.Property(e => e.IncidentId)
                .HasComment("Mã sự cố — khóa chính tự tăng")
                .HasColumnName("incident_id");
            entity.Property(e => e.ApprovedBy)
                .HasComment("Nhân viên (Manager/Admin) duyệt hoặc từ chối sự cố — FK tới employees.employee_id")
                .HasColumnName("approved_by");
            entity.Property(e => e.AssignedTo)
                .HasComment("Nhân viên/kỹ thuật được phân công xử lý — FK tới employees.employee_id. Bắt buộc điền khi status = Assigned")
                .HasColumnName("assigned_to");
            entity.Property(e => e.BranchId)
                .HasComment("Chi nhánh xảy ra sự cố — FK tới branches.branch_id")
                .HasColumnName("branch_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo báo cáo sự cố")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasComment("Mô tả chi tiết hiện trạng sự cố")
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.EquipmentId)
                .HasComment("Thiết bị liên quan — FK tới equipment.equipment_id. NULL nếu sự cố không liên quan thiết bị cụ thể")
                .HasColumnName("equipment_id");
            entity.Property(e => e.ImageUrl)
                .HasComment("URL ảnh minh chứng sự cố lưu trên S3, có thể NULL")
                .HasColumnType("text")
                .HasColumnName("image_url");
            entity.Property(e => e.RejectReason)
                .HasComment("Lý do từ chối sự cố — bắt buộc điền khi status = Rejected")
                .HasColumnType("text")
                .HasColumnName("reject_reason");
            entity.Property(e => e.ReportedByEmployeeId)
                .HasComment("Nhân viên báo cáo sự cố — FK tới employees.employee_id. Điền khi người báo cáo là nhân viên")
                .HasColumnName("reported_by_employee_id");
            entity.Property(e => e.ReportedByMemberId)
                .HasComment("Hội viên báo cáo sự cố — FK tới members.member_id. Điền khi người báo cáo là hội viên")
                .HasColumnName("reported_by_member_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'PendingApproval'")
                .HasComment("Trạng thái: PendingApproval=chờ duyệt, Assigned=đã phân công, Rejected=bị từ chối")
                .HasColumnType("enum('PendingApproval','Assigned','Rejected')")
                .HasColumnName("status");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasComment("Tiêu đề ngắn gọn mô tả sự cố")
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm cập nhật trạng thái gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.IncidentApprovedByNavigations)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("fk_su_co_approved");

            entity.HasOne(d => d.AssignedToNavigation).WithMany(p => p.IncidentAssignedToNavigations)
                .HasForeignKey(d => d.AssignedTo)
                .HasConstraintName("fk_su_co_assigned");

            entity.HasOne(d => d.Branch).WithMany(p => p.Incidents)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_su_co_cn");

            entity.HasOne(d => d.Equipment).WithMany(p => p.Incidents)
                .HasForeignKey(d => d.EquipmentId)
                .HasConstraintName("fk_su_co_tb");

            entity.HasOne(d => d.ReportedByEmployee).WithMany(p => p.IncidentReportedByEmployees)
                .HasForeignKey(d => d.ReportedByEmployeeId)
                .HasConstraintName("fk_su_co_nv");

            entity.HasOne(d => d.ReportedByMember).WithMany(p => p.Incidents)
                .HasForeignKey(d => d.ReportedByMemberId)
                .HasConstraintName("fk_su_co_hv");
        });

        modelBuilder.Entity<Member>(entity =>
        {
            entity.HasKey(e => e.MemberId).HasName("PRIMARY");

            entity.ToTable("members", tb => tb.HasComment("Hội viên phòng gym"));

            entity.HasIndex(e => e.BranchId, "fk_member_branch");

            entity.HasIndex(e => e.CreatedBy, "fk_member_creator");

            entity.HasIndex(e => e.Phone, "uq_member_phone").IsUnique();

            entity.Property(e => e.MemberId)
                .HasComment("Mã hội viên — khóa chính tự tăng")
                .HasColumnName("member_id");
            entity.Property(e => e.BranchId)
                .HasComment("Chi nhánh hội viên đăng ký — FK tới branches.branch_id, NULL nếu chưa gán")
                .HasColumnName("branch_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo tài khoản")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Nhân viên tạo tài khoản hội viên này — FK tới employees.employee_id")
                .HasColumnName("created_by");
            entity.Property(e => e.FullName)
                .HasMaxLength(100)
                .HasComment("Họ và tên đầy đủ của hội viên")
                .HasColumnName("full_name");
            entity.Property(e => e.Gender)
                .HasComment("Giới tính của hội viên")
                .HasColumnType("enum('Male','Female','Other')")
                .HasColumnName("gender");
            entity.Property(e => e.InternalNotes)
                .HasComment("Ghi chú nội bộ dành cho nhân viên, hội viên không thấy")
                .HasColumnType("text")
                .HasColumnName("internal_notes");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasComment("Mật khẩu đã mã hóa bcrypt, không lưu bản rõ")
                .HasColumnName("password_hash");
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .HasComment("Số điện thoại — dùng làm tên đăng nhập, phải duy nhất")
                .HasColumnName("phone");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'PendingActivation'")
                .HasComment("Trạng thái tài khoản: PendingActivation=chờ kích hoạt, Active=đang hoạt động, Expired=hết hạn, Suspended=bị khóa")
                .HasColumnType("enum('PendingActivation','Active','Expired','Suspended')")
                .HasColumnName("status");
            entity.Property(e => e.SuspendReason)
                .HasComment("Lý do tạm khóa — bắt buộc điền khi status = Suspended")
                .HasColumnType("text")
                .HasColumnName("suspend_reason");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm cập nhật gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Branch).WithMany(p => p.Members)
                .HasForeignKey(d => d.BranchId)
                .HasConstraintName("fk_member_branch");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Members)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("fk_member_creator");
        });

        modelBuilder.Entity<MemberPackage>(entity =>
        {
            entity.HasKey(e => e.MemberPackageId).HasName("PRIMARY");

            entity.ToTable("member_packages", tb => tb.HasComment("Gói tập đã mua của từng hội viên, lưu ngày hiệu lực và trạng thái"));

            entity.HasIndex(e => e.MemberId, "fk_mp_member");

            entity.HasIndex(e => e.PlanId, "fk_mp_plan");

            entity.HasIndex(e => e.PromotionId, "fk_mp_promotion");

            entity.HasIndex(e => e.TransactionId, "fk_mp_transaction");

            entity.Property(e => e.MemberPackageId)
                .HasComment("Mã gói hội viên — khóa chính tự tăng")
                .HasColumnName("member_package_id");
            entity.Property(e => e.Amount)
                .HasPrecision(12)
                .HasComment("Số tiền thực thu sau khuyến mãi (VNĐ), sao chép từ transactions.amount")
                .HasColumnName("amount");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo bản ghi")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiryDate)
                .HasComment("Ngày hết hạn = start_date + duration_days + so_ngay_tang_thuc_te")
                .HasColumnName("expiry_date");
            entity.Property(e => e.GiaGoc)
                .HasPrecision(12)
                .HasComment("Giá niêm yết của gói tại thời điểm mua (VNĐ)")
                .HasColumnName("gia_goc");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên sở hữu gói — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.PackageStatus)
                .HasColumnType("enum('Active','Expired','Cancelled')")
                .HasColumnName("package_status");
            entity.Property(e => e.PlanId)
                .HasComment("Gói tập được mua — FK tới membership_plans.plan_id")
                .HasColumnName("plan_id");
            entity.Property(e => e.PromotionId)
                .HasComment("Khuyến mãi được áp dụng — FK tới promotions.promotion_id, NULL nếu không có")
                .HasColumnName("promotion_id");
            entity.Property(e => e.SoNgayTangThucTe)
                .HasComment("Số ngày tặng thêm đã quy đổi thực tế: TangNgay=so_ngay_tang, TangChuKy=so_chu_ky_tang×duration_days, không KM=0")
                .HasColumnName("so_ngay_tang_thuc_te");
            entity.Property(e => e.StartDate)
                .HasComment("Ngày bắt đầu có hiệu lực của gói")
                .HasColumnName("start_date");
            entity.Property(e => e.TransactionId)
                .HasComment("Giao dịch thanh toán tương ứng — FK tới transactions.transaction_id")
                .HasColumnName("transaction_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm cập nhật gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Member).WithMany(p => p.MemberPackages)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mp_member");

            entity.HasOne(d => d.Plan).WithMany(p => p.MemberPackages)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mp_plan");

            entity.HasOne(d => d.Promotion).WithMany(p => p.MemberPackages)
                .HasForeignKey(d => d.PromotionId)
                .HasConstraintName("fk_mp_promotion");

            entity.HasOne(d => d.Transaction).WithMany(p => p.MemberPackages)
                .HasForeignKey(d => d.TransactionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mp_transaction");
        });

        modelBuilder.Entity<MemberUpdateLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("member_update_logs", tb => tb.HasComment("Lịch sử cập nhật thông tin hội viên (theo từng field) — chỉ ghi thêm, không sửa xóa"));

            entity.HasIndex(e => e.UpdatedByEmployeeId, "fk_mul_employee");

            entity.HasIndex(e => new { e.MemberId, e.FieldName }, "idx_mul_member");

            entity.HasIndex(e => e.UpdateSessionId, "idx_mul_session");

            entity.Property(e => e.Id)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("id");
            entity.Property(e => e.FieldName)
                .HasMaxLength(100)
                .HasComment("Tên trường dữ liệu bị thay đổi, VD: phone, full_name, gender")
                .HasColumnName("field_name");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên được cập nhật thông tin — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.NewValue)
                .HasComment("Giá trị mới sau khi thay đổi")
                .HasColumnType("text")
                .HasColumnName("new_value");
            entity.Property(e => e.OldValue)
                .HasComment("Giá trị cũ trước khi thay đổi — NULL nếu trường trước đó chưa có giá trị")
                .HasColumnType("text")
                .HasColumnName("old_value");
            entity.Property(e => e.UpdateSessionId)
                .HasComment("Mã phiên cập nhật (UUID) — nhóm các field_name cùng thay đổi trong 1 lần lưu")
                .HasColumnName("update_session_id");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm thực hiện cập nhật")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedByEmployeeId)
                .HasComment("Nhân viên thực hiện cập nhật — FK tới employees.employee_id")
                .HasColumnName("updated_by_employee_id");

            entity.HasOne(d => d.Member).WithMany(p => p.MemberUpdateLogs)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mul_member");

            entity.HasOne(d => d.UpdatedByEmployee).WithMany(p => p.MemberUpdateLogs)
                .HasForeignKey(d => d.UpdatedByEmployeeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mul_employee");
        });

        modelBuilder.Entity<MembershipPlan>(entity =>
        {
            entity.HasKey(e => e.PlanId).HasName("PRIMARY");

            entity.ToTable("membership_plans", tb => tb.HasComment("Danh sách gói tập phòng gym"));

            entity.Property(e => e.PlanId)
                .HasComment("Mã gói tập — khóa chính tự tăng")
                .HasColumnName("plan_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo gói tập")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasComment("Mô tả quyền lợi gói tập hiển thị cho hội viên")
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.DurationDays)
                .HasComment("Thời hạn gói tính bằng số ngày kể từ ngày bắt đầu")
                .HasColumnName("duration_days");
            entity.Property(e => e.IsPopular).HasColumnName("is_popular");
            entity.Property(e => e.PlanName)
                .HasMaxLength(150)
                .HasComment("Tên hiển thị của gói tập, VD: Gói 1 Tháng, Gói PRO 3 Tháng")
                .HasColumnName("plan_name");
            entity.Property(e => e.Price)
                .HasPrecision(12)
                .HasComment("Giá niêm yết của gói (VNĐ), không có số thập phân")
                .HasColumnName("price");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'OnSale'")
                .HasComment("Trạng thái bán: OnSale = đang bán, Discontinued = ngừng bán")
                .HasColumnType("enum('OnSale','Discontinued')")
                .HasColumnName("status");
        });

        modelBuilder.Entity<News>(entity =>
        {
            entity.HasKey(e => e.NewsId).HasName("PRIMARY");

            entity.ToTable("news", tb => tb.HasComment("Tin tức / bài viết hiển thị cho hội viên"));

            entity.HasIndex(e => e.CreatedBy, "fk_news_nv");

            entity.HasIndex(e => new { e.Status, e.PublishedAt }, "idx_news_status");

            entity.Property(e => e.NewsId)
                .HasComment("Mã tin tức — khóa chính tự tăng")
                .HasColumnName("news_id");
            entity.Property(e => e.Content)
                .HasComment("Nội dung đầy đủ của bài tin tức")
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo bài viết")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Nhân viên soạn bài — FK tới employees.employee_id")
                .HasColumnName("created_by");
            entity.Property(e => e.PublishedAt)
                .HasComment("Thời điểm bài viết được đăng — điền khi status = Published")
                .HasColumnType("datetime")
                .HasColumnName("published_at");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Hidden')")
                .HasColumnName("status");
            entity.Property(e => e.Summary)
                .HasMaxLength(500)
                .HasComment("Tóm tắt ngắn hiển thị ở danh sách tin tức")
                .HasColumnName("summary");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasComment("Tiêu đề tin tức")
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm cập nhật gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.News)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_news_nv");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("PRIMARY");

            entity.ToTable("notifications", tb => tb.HasComment("Thông báo nhắc hội viên khi gói tập sắp hết hạn — do background job tự sinh"));

            entity.HasIndex(e => new { e.MemberId, e.IsRead }, "idx_notif_hv");

            entity.HasIndex(e => new { e.MemberPackageId, e.DaysBeforeExpiry }, "uq_notif_goi_nguong").IsUnique();

            entity.Property(e => e.NotificationId)
                .HasComment("Mã thông báo — khóa chính tự tăng")
                .HasColumnName("notification_id");
            entity.Property(e => e.Content)
                .HasComment("Nội dung chi tiết thông báo")
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo thông báo")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.DaysBeforeExpiry)
                .HasComment("Số ngày còn lại trước khi hết hạn tại thời điểm gửi, VD: 7, 3, 1, 0")
                .HasColumnName("days_before_expiry");
            entity.Property(e => e.IsRead)
                .HasComment("0 = chưa đọc, 1 = đã đọc — cập nhật khi hội viên mở thông báo")
                .HasColumnName("is_read");
            entity.Property(e => e.IsSent)
                .HasComment("0 = chưa gửi, 1 = đã gửi — cập nhật bởi background job")
                .HasColumnName("is_sent");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên nhận thông báo — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.MemberPackageId)
                .HasComment("Gói tập sắp hết hạn tương ứng — FK tới member_packages.member_package_id")
                .HasColumnName("member_package_id");
            entity.Property(e => e.ScheduledAt)
                .HasComment("Thời điểm hẹn gửi thông báo")
                .HasColumnType("datetime")
                .HasColumnName("scheduled_at");
            entity.Property(e => e.SentAt)
                .HasComment("Thời điểm thực tế đã gửi")
                .HasColumnType("datetime")
                .HasColumnName("sent_at");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasComment("Tiêu đề thông báo, VD: Gói tập của bạn sắp hết hạn")
                .HasColumnName("title");

            entity.HasOne(d => d.Member).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_tb_hv");

            entity.HasOne(d => d.MemberPackage).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.MemberPackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_tb_goi_hv");
        });

        modelBuilder.Entity<Otp>(entity =>
        {
            entity.HasKey(e => e.OtpId).HasName("PRIMARY");

            entity.ToTable("otp", tb => tb.HasComment("Mã OTP xác thực một lần gửi qua SMS"));

            entity.HasIndex(e => e.ExpiresAt, "idx_otp_het_han");

            entity.HasIndex(e => new { e.Phone, e.Purpose }, "idx_otp_phone_purpose");

            entity.Property(e => e.OtpId)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("otp_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo và gửi OTP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt)
                .HasComment("Thời điểm OTP hết hạn — thường 5 phút kể từ lúc tạo")
                .HasColumnType("datetime")
                .HasColumnName("expires_at");
            entity.Property(e => e.FailedAttempts)
                .HasComment("Số lần nhập sai liên tiếp — ứng dụng khóa sau N lần")
                .HasColumnName("failed_attempts");
            entity.Property(e => e.IsUsed)
                .HasComment("0 = chưa dùng, 1 = đã dùng thành công")
                .HasColumnName("is_used");
            entity.Property(e => e.OtpCode)
                .HasMaxLength(10)
                .HasComment("Mã OTP gửi cho người dùng (lưu dạng hash nếu cần bảo mật cao hơn)")
                .HasColumnName("otp_code");
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .HasComment("Số điện thoại nhận OTP")
                .HasColumnName("phone");
            entity.Property(e => e.Purpose)
                .HasComment("Mục đích: DangKy=đăng ký mới, QuenMatKhau=đặt lại mật khẩu, DoiSoDienThoai=xác nhận đổi số")
                .HasColumnType("enum('DangKy','QuenMatKhau','DoiSoDienThoai')")
                .HasColumnName("purpose");
        });

        modelBuilder.Entity<Promotion>(entity =>
        {
            entity.HasKey(e => e.PromotionId).HasName("PRIMARY");

            entity.ToTable("promotions", tb => tb.HasComment("Chương trình khuyến mãi do Admin/Manager tạo"));

            entity.HasIndex(e => e.NguoiTao, "fk_km_nguoi_tao");

            entity.HasIndex(e => new { e.TrangThai, e.NgayBatDau, e.NgayKetThuc }, "idx_km_trangthai_thoigian");

            entity.Property(e => e.PromotionId)
                .HasComment("Mã khuyến mãi — khóa chính tự tăng")
                .HasColumnName("promotion_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo chương trình")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.GioiHanLuot)
                .HasComment("Tổng số lượt dùng tối đa toàn chương trình. NULL = không giới hạn")
                .HasColumnName("gioi_han_luot");
            entity.Property(e => e.MoTa)
                .HasComment("Mô tả chi tiết quyền lợi hiển thị cho hội viên")
                .HasColumnType("text")
                .HasColumnName("mo_ta");
            entity.Property(e => e.MucGiamToiDa)
                .HasPrecision(12)
                .HasComment("[GiamPhanTram] Số tiền giảm tối đa (VNĐ). NULL = không giới hạn mức giảm")
                .HasColumnName("muc_giam_toi_da");
            entity.Property(e => e.NgayBatDau)
                .HasComment("Thời điểm bắt đầu áp dụng khuyến mãi")
                .HasColumnType("datetime")
                .HasColumnName("ngay_bat_dau");
            entity.Property(e => e.NgayKetThuc)
                .HasComment("Thời điểm kết thúc — sau mốc này không áp dụng nữa")
                .HasColumnType("datetime")
                .HasColumnName("ngay_ket_thuc");
            entity.Property(e => e.NguoiTao)
                .HasComment("Nhân viên (Admin/Manager) tạo chương trình — FK tới employees.employee_id")
                .HasColumnName("nguoi_tao");
            entity.Property(e => e.PhanTramGiam)
                .HasPrecision(5, 2)
                .HasComment("[GiamPhanTram] Phần trăm giảm, VD: 50.00 = giảm 50%. NULL nếu không phải loại này")
                .HasColumnName("phan_tram_giam");
            entity.Property(e => e.PromoType)
                .HasComment("Loại khuyến mãi: GiamPhanTram=giảm %, GiamTienMat=giảm tiền cố định, TangNgay=tặng N ngày, TangChuKy=tặng N chu kỳ")
                .HasColumnType("enum('GiamPhanTram','GiamTienMat','TangNgay','TangChuKy')")
                .HasColumnName("promo_type");
            entity.Property(e => e.SoChuKyTang)
                .HasComment("[TangChuKy] Số chu kỳ tặng thêm, 1 chu kỳ = duration_days của gói. NULL nếu không phải loại này")
                .HasColumnName("so_chu_ky_tang");
            entity.Property(e => e.SoLuotDaDung)
                .HasComment("Số lượt đã dùng, tự tăng mỗi khi khuyến mãi được áp dụng thành công")
                .HasColumnName("so_luot_da_dung");
            entity.Property(e => e.SoNgayTang)
                .HasComment("[TangNgay] Số ngày tặng thêm vào ngày hết hạn. NULL nếu không phải loại này")
                .HasColumnName("so_ngay_tang");
            entity.Property(e => e.SoTienGiam)
                .HasPrecision(12)
                .HasComment("[GiamTienMat] Số tiền giảm cố định (VNĐ). NULL nếu không phải loại này")
                .HasColumnName("so_tien_giam");
            entity.Property(e => e.TenKhuyenMai)
                .HasMaxLength(200)
                .HasComment("Tên hiển thị chương trình, VD: Giảm 50% Gói PRO tháng 6")
                .HasColumnName("ten_khuyen_mai");
            entity.Property(e => e.TrangThai)
                .HasDefaultValueSql("'NhapLieu'")
                .HasComment("Trạng thái: NhapLieu=đang soạn, HoatDong=đang chạy, TamDung=tạm dừng, HetHan=đã kết thúc")
                .HasColumnType("enum('NhapLieu','HoatDong','TamDung','HetHan')")
                .HasColumnName("trang_thai");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm cập nhật gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.NguoiTaoNavigation).WithMany(p => p.Promotions)
                .HasForeignKey(d => d.NguoiTao)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_km_nguoi_tao");
        });

        modelBuilder.Entity<PromotionPlan>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("promotion_plans", tb => tb.HasComment("Liên kết nhiều-nhiều giữa khuyến mãi và gói tập. Mỗi gói chỉ có 1 KM active tại 1 thời điểm — kiểm tra qua stored procedure"));

            entity.HasIndex(e => e.PlanId, "idx_pp_goi");

            entity.HasIndex(e => new { e.PromotionId, e.PlanId }, "uq_km_goi").IsUnique();

            entity.Property(e => e.Id)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("id");
            entity.Property(e => e.PlanId)
                .HasComment("Mã gói tập được gắn vào khuyến mãi — FK tới membership_plans.plan_id")
                .HasColumnName("plan_id");
            entity.Property(e => e.PromotionId)
                .HasComment("Mã khuyến mãi — FK tới promotions.promotion_id")
                .HasColumnName("promotion_id");

            entity.HasOne(d => d.Plan).WithMany(p => p.PromotionPlans)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_pp_goi_tap");

            entity.HasOne(d => d.Promotion).WithMany(p => p.PromotionPlans)
                .HasForeignKey(d => d.PromotionId)
                .HasConstraintName("fk_pp_khuyen_mai");
        });

        modelBuilder.Entity<PromotionUsage>(entity =>
        {
            entity.HasKey(e => e.UsageId).HasName("PRIMARY");

            entity.ToTable("promotion_usages", tb => tb.HasComment("Lịch sử áp dụng khuyến mãi — chỉ ghi thêm, không sửa xóa"));

            entity.HasIndex(e => e.PlanId, "fk_su_dung_goi");

            entity.HasIndex(e => e.MemberId, "fk_su_dung_hv");

            entity.HasIndex(e => e.PromotionId, "fk_su_dung_km");

            entity.HasIndex(e => e.MemberPackageId, "uq_su_dung_package").IsUnique();

            entity.Property(e => e.UsageId)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("usage_id");
            entity.Property(e => e.ApDungLuc)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm khuyến mãi được áp dụng")
                .HasColumnType("datetime")
                .HasColumnName("ap_dung_luc");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên được hưởng — FK tới members.member_id, lưu để truy vấn nhanh")
                .HasColumnName("member_id");
            entity.Property(e => e.MemberPackageId)
                .HasComment("Gói hội viên được hưởng khuyến mãi — FK tới member_packages.member_package_id")
                .HasColumnName("member_package_id");
            entity.Property(e => e.PlanId)
                .HasComment("Gói tập tương ứng — FK tới membership_plans.plan_id, lưu để truy vấn nhanh")
                .HasColumnName("plan_id");
            entity.Property(e => e.PromotionId)
                .HasComment("Khuyến mãi được áp dụng — FK tới promotions.promotion_id")
                .HasColumnName("promotion_id");
            entity.Property(e => e.SoNgayDuocTang)
                .HasComment("Số ngày thực tế được cộng thêm vào ngày hết hạn. = 0 nếu loại GiamPhanTram hoặc GiamTienMat")
                .HasColumnName("so_ngay_duoc_tang");
            entity.Property(e => e.SoTienDaGiam)
                .HasPrecision(12)
                .HasComment("Số tiền thực tế được giảm (VNĐ). = 0 nếu loại TangNgay hoặc TangChuKy")
                .HasColumnName("so_tien_da_giam");

            entity.HasOne(d => d.Member).WithMany(p => p.PromotionUsages)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_su_dung_hv");

            entity.HasOne(d => d.MemberPackage).WithOne(p => p.PromotionUsage)
                .HasForeignKey<PromotionUsage>(d => d.MemberPackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_su_dung_package");

            entity.HasOne(d => d.Plan).WithMany(p => p.PromotionUsages)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_su_dung_goi");

            entity.HasOne(d => d.Promotion).WithMany(p => p.PromotionUsages)
                .HasForeignKey(d => d.PromotionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_su_dung_km");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.TokenId).HasName("PRIMARY");

            entity.ToTable("refresh_tokens", tb => tb.HasComment("Refresh token cho hội viên và nhân viên"));

            entity.HasIndex(e => new { e.EntityId, e.EntityType }, "idx_rt_entity");

            entity.HasIndex(e => e.TokenHash, "uq_token_hash").IsUnique();

            entity.Property(e => e.TokenId)
                .HasComment("Mã token — khóa chính tự tăng")
                .HasColumnName("token_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo token")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.EntityId)
                .HasComment("ID của tài khoản sở hữu token (member_id hoặc employee_id)")
                .HasColumnName("entity_id");
            entity.Property(e => e.EntityType)
                .HasComment("Loại tài khoản sở hữu token")
                .HasColumnType("enum('Member','Employee')")
                .HasColumnName("entity_type");
            entity.Property(e => e.ExpiresAt)
                .HasComment("Thời điểm token hết hạn")
                .HasColumnType("datetime")
                .HasColumnName("expires_at");
            entity.Property(e => e.RevokedAt)
                .HasComment("Thời điểm token bị thu hồi")
                .HasColumnType("datetime")
                .HasColumnName("revoked_at");
            entity.Property(e => e.Role)
                .HasMaxLength(50)
                .HasComment("Role tại thời điểm đăng nhập")
                .HasColumnName("role");
            entity.Property(e => e.TokenHash)
                .HasComment("SHA-256 hash của refresh token")
                .HasColumnName("token_hash");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PRIMARY");

            entity.ToTable("roles", tb => tb.HasComment("Vai trò của nhân viên trong hệ thống"));

            entity.HasIndex(e => e.RoleName, "uq_role_name").IsUnique();

            entity.Property(e => e.RoleId)
                .HasComment("Mã vai trò — khóa chính tự tăng")
                .HasColumnName("role_id");
            entity.Property(e => e.RoleName)
                .HasMaxLength(50)
                .HasComment("Tên vai trò, VD: Staff, Manager, Admin, Technician")
                .HasColumnName("role_name");
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.TransactionId).HasName("PRIMARY");

            entity.ToTable("transactions", tb => tb.HasComment("Giao dịch thanh toán mua hoặc gia hạn gói tập"));

            entity.HasIndex(e => e.PlanId, "fk_gd_goi");

            entity.HasIndex(e => e.MemberId, "fk_gd_hv");

            entity.HasIndex(e => e.PromotionId, "fk_transaction_promotion");

            entity.HasIndex(e => e.EmployeeId, "fk_transactions_employee");

            entity.HasIndex(e => e.OrderCode, "order_code").IsUnique();

            entity.Property(e => e.TransactionId)
                .HasComment("Mã giao dịch — khóa chính tự tăng")
                .HasColumnName("transaction_id");
            entity.Property(e => e.Amount)
                .HasPrecision(12)
                .HasComment("Số tiền thực thu sau khi áp khuyến mãi (VNĐ). Bằng gia_goc nếu không có KM")
                .HasColumnName("amount");
            entity.Property(e => e.BankReferenceCode)
                .HasMaxLength(100)
                .HasColumnName("bank_reference_code");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo giao dịch")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.EmployeeId)
                .HasComment("Nhân viên tạo giao dịch, NULL nếu khách tự mua")
                .HasColumnName("employee_id");
            entity.Property(e => e.GiaGoc)
                .HasPrecision(12)
                .HasComment("Giá niêm yết của gói trước khi áp khuyến mãi (VNĐ)")
                .HasColumnName("gia_goc");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên thực hiện giao dịch — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.OrderCode)
                .HasMaxLength(50)
                .HasColumnName("order_code");
            entity.Property(e => e.PaymentMethod)
                .HasComment("Phương thức thanh toán: Cash = tiền mặt, BankTransfer = chuyển khoản")
                .HasColumnType("enum('Cash','BankTransfer')")
                .HasColumnName("payment_method");
            entity.Property(e => e.PaymentStatus)
                .HasDefaultValueSql("'Pending'")
                .HasComment("Trạng thái thanh toán: Pending=chờ xác nhận, Paid=đã thanh toán, Failed=thất bại")
                .HasColumnType("enum('Pending','Paid','Failed')")
                .HasColumnName("payment_status");
            entity.Property(e => e.PlanId)
                .HasComment("Gói tập được mua trong giao dịch này — FK tới membership_plans.plan_id")
                .HasColumnName("plan_id");
            entity.Property(e => e.PromotionId).HasColumnName("promotion_id");
            entity.Property(e => e.ReceiptImage)
                .HasMaxLength(500)
                .HasComment("URL ảnh biên lai / chứng từ chuyển khoản lưu trên S3")
                .HasColumnName("receipt_image");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm cập nhật gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Employee).WithMany(p => p.Transactions)
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_transactions_employee");

            entity.HasOne(d => d.Member).WithMany(p => p.Transactions)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_gd_hv");

            entity.HasOne(d => d.Plan).WithMany(p => p.Transactions)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_gd_goi");

            entity.HasOne(d => d.Promotion).WithMany(p => p.Transactions)
                .HasForeignKey(d => d.PromotionId)
                .HasConstraintName("fk_transaction_promotion");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
