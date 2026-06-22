using System;
using System.Collections.Generic;
using BE.Models;
using Microsoft.EntityFrameworkCore;

namespace BE.Data;

public partial class GymManagementContext : DbContext
{
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

    public virtual DbSet<FaceDatum> FaceData { get; set; }

    public virtual DbSet<FaceUpdateHistory> FaceUpdateHistories { get; set; }

    public virtual DbSet<GymDensity> GymDensities { get; set; }

    public virtual DbSet<Incident> Incidents { get; set; }

    public virtual DbSet<IncidentAssignment> IncidentAssignments { get; set; }

    public virtual DbSet<Member> Members { get; set; }

    public virtual DbSet<MemberGroup> MemberGroups { get; set; }

    public virtual DbSet<MemberGroupMember> MemberGroupMembers { get; set; }

    public virtual DbSet<MemberPackage> MemberPackages { get; set; }

    public virtual DbSet<MemberUpdateLog> MemberUpdateLogs { get; set; }

    public virtual DbSet<MembershipPlan> MembershipPlans { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<NotificationRecipient> NotificationRecipients { get; set; }

    public virtual DbSet<Otp> Otps { get; set; }

    public virtual DbSet<Promotion> Promotions { get; set; }

    public virtual DbSet<PromotionPlan> PromotionPlans { get; set; }

    public virtual DbSet<PromotionUsage> PromotionUsages { get; set; }

    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Transaction> Transactions { get; set; }

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
            entity.Property(e => e.CheckOutTime)
                .HasComment("Thời điểm hội viên ra về. NULL = chưa check out hoặc không xác định được")
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

            entity.HasOne(d => d.Member).WithMany(p => p.CheckIns)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_checkin_hv");

            entity.HasOne(d => d.MemberPackage).WithMany(p => p.CheckIns)
                .HasForeignKey(d => d.MemberPackageId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_checkin_package");

            entity.HasOne(d => d.Staff).WithMany(p => p.CheckIns)
                .HasForeignKey(d => d.StaffId)
                .HasConstraintName("fk_checkin_nv");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.EmployeeId).HasName("PRIMARY");

            entity.ToTable("employees", tb => tb.HasComment("Tài khoản nhân viên vận hành phòng gym"));

            entity.HasIndex(e => e.CreatedBy, "fk_employee_creator");

            entity.HasIndex(e => e.RoleId, "fk_employee_role");

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

        modelBuilder.Entity<Incident>(entity =>
        {
            entity.HasKey(e => e.IncidentId).HasName("PRIMARY");

            entity.ToTable("incidents", tb => tb.HasComment("Báo cáo sự cố thiết bị và cơ sở vật chất tại các chi nhánh"));

            entity.HasIndex(e => e.BranchId, "fk_su_co_cn");

            entity.HasIndex(e => e.ReportedBy, "fk_su_co_nv");

            entity.HasIndex(e => e.EquipmentId, "fk_su_co_tb");

            entity.Property(e => e.IncidentId)
                .HasComment("Mã sự cố — khóa chính tự tăng")
                .HasColumnName("incident_id");
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
            entity.Property(e => e.ReportedBy)
                .HasComment("Nhân viên báo cáo sự cố — FK tới employees.employee_id")
                .HasColumnName("reported_by");
            entity.Property(e => e.ResolvedAt)
                .HasComment("Thời điểm sự cố được xử lý hoàn tất — điền khi status = Resolved")
                .HasColumnType("datetime")
                .HasColumnName("resolved_at");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'PendingApproval'")
                .HasComment("Trạng thái xử lý: PendingApproval=chờ duyệt, Assigned=đã phân công, Resolved=đã xử lý xong, Rejected=bị từ chối. Phải đồng bộ với incident_assignments.work_status")
                .HasColumnType("enum('PendingApproval','Assigned','Resolved','Rejected')")
                .HasColumnName("status");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasComment("Tiêu đề ngắn gọn mô tả sự cố")
                .HasColumnName("title");

            entity.HasOne(d => d.Branch).WithMany(p => p.Incidents)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_su_co_cn");

            entity.HasOne(d => d.Equipment).WithMany(p => p.Incidents)
                .HasForeignKey(d => d.EquipmentId)
                .HasConstraintName("fk_su_co_tb");

            entity.HasOne(d => d.ReportedByNavigation).WithMany(p => p.Incidents)
                .HasForeignKey(d => d.ReportedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_su_co_nv");
        });

        modelBuilder.Entity<IncidentAssignment>(entity =>
        {
            entity.HasKey(e => e.AssignmentId).HasName("PRIMARY");

            entity.ToTable("incident_assignments", tb => tb.HasComment("Phân công kỹ thuật viên xử lý sự cố. Khi Completed phải đồng bộ incidents.status"));

            entity.HasIndex(e => e.TechnicianId, "fk_pc_ktv");

            entity.HasIndex(e => e.ManagerId, "fk_pc_ql");

            entity.HasIndex(e => e.IncidentId, "uq_phan_cong_su_co").IsUnique();

            entity.Property(e => e.AssignmentId)
                .HasComment("Mã phân công — khóa chính tự tăng")
                .HasColumnName("assignment_id");
            entity.Property(e => e.AfterImage)
                .HasComment("URL ảnh sau khi sửa xong, dùng để xác nhận hoàn tất")
                .HasColumnType("text")
                .HasColumnName("after_image");
            entity.Property(e => e.AssignedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm quản lý thực hiện phân công")
                .HasColumnType("datetime")
                .HasColumnName("assigned_at");
            entity.Property(e => e.CompletedAt)
                .HasComment("Thời điểm kỹ thuật viên hoàn thành — điền khi work_status = Completed")
                .HasColumnType("datetime")
                .HasColumnName("completed_at");
            entity.Property(e => e.IncidentId)
                .HasComment("Sự cố cần xử lý — FK tới incidents.incident_id, mỗi sự cố chỉ có 1 phân công")
                .HasColumnName("incident_id");
            entity.Property(e => e.ManagerId)
                .HasComment("Quản lý thực hiện phân công — FK tới employees.employee_id")
                .HasColumnName("manager_id");
            entity.Property(e => e.TechnicianId)
                .HasComment("Kỹ thuật viên được giao việc — FK tới employees.employee_id")
                .HasColumnName("technician_id");
            entity.Property(e => e.WorkNotes)
                .HasComment("Ghi chú tiến độ do kỹ thuật viên cập nhật")
                .HasColumnType("text")
                .HasColumnName("work_notes");
            entity.Property(e => e.WorkStatus)
                .HasDefaultValueSql("'NotStarted'")
                .HasComment("Tiến độ công việc: NotStarted=chưa bắt đầu, InProgress=đang sửa, WaitingForParts=chờ linh kiện, Completed=hoàn thành. Khi Completed phải cập nhật incidents.status=Resolved")
                .HasColumnType("enum('NotStarted','InProgress','WaitingForParts','Completed')")
                .HasColumnName("work_status");

            entity.HasOne(d => d.Incident).WithOne(p => p.IncidentAssignment)
                .HasForeignKey<IncidentAssignment>(d => d.IncidentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_pc_su_co");

            entity.HasOne(d => d.Manager).WithMany(p => p.IncidentAssignmentManagers)
                .HasForeignKey(d => d.ManagerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_pc_ql");

            entity.HasOne(d => d.Technician).WithMany(p => p.IncidentAssignmentTechnicians)
                .HasForeignKey(d => d.TechnicianId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_pc_ktv");
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

        modelBuilder.Entity<MemberGroup>(entity =>
        {
            entity.HasKey(e => e.GroupId).HasName("PRIMARY");

            entity.ToTable("member_groups", tb => tb.HasComment("Nhóm hội viên dùng để gửi thông báo theo nhóm (ByGroup)"));

            entity.HasIndex(e => e.CreatedBy, "fk_nhom_nguoi_tao");

            entity.Property(e => e.GroupId)
                .HasComment("Mã nhóm — khóa chính tự tăng")
                .HasColumnName("group_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo nhóm")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Nhân viên tạo nhóm — FK tới employees.employee_id")
                .HasColumnName("created_by");
            entity.Property(e => e.Description)
                .HasComment("Mô tả mục đích hoặc tiêu chí của nhóm")
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.GroupName)
                .HasMaxLength(150)
                .HasComment("Tên nhóm hội viên, VD: Khách VIP, Học sinh sinh viên")
                .HasColumnName("group_name");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.MemberGroups)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_nhom_nguoi_tao");
        });

        modelBuilder.Entity<MemberGroupMember>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("member_group_members", tb => tb.HasComment("Bảng trung gian liên kết hội viên với nhóm"));

            entity.HasIndex(e => e.MemberId, "fk_nhom_tv_hv");

            entity.HasIndex(e => new { e.GroupId, e.MemberId }, "uq_nhom_hv").IsUnique();

            entity.Property(e => e.Id)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("id");
            entity.Property(e => e.GroupId)
                .HasComment("Nhóm hội viên — FK tới member_groups.group_id")
                .HasColumnName("group_id");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên thuộc nhóm — FK tới members.member_id")
                .HasColumnName("member_id");

            entity.HasOne(d => d.Group).WithMany(p => p.MemberGroupMembers)
                .HasForeignKey(d => d.GroupId)
                .HasConstraintName("fk_nhom_tv_nhom");

            entity.HasOne(d => d.Member).WithMany(p => p.MemberGroupMembers)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_nhom_tv_hv");
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
                .HasDefaultValueSql("'Pending'")
                .HasComment("Trạng thái gói: Pending=chờ thanh toán, Active=đang hiệu lực, Expired=hết hạn, Cancelled=đã hủy")
                .HasColumnType("enum('Pending','Active','Expired','Cancelled')")
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

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("PRIMARY");

            entity.ToTable("notifications", tb => tb.HasComment("Thông báo đẩy gửi đến hội viên theo đối tượng"));

            entity.HasIndex(e => e.BranchId, "fk_tb_cn");

            entity.HasIndex(e => e.CreatedBy, "fk_tb_nguoi_tao");

            entity.HasIndex(e => e.GroupId, "fk_tb_nhom");

            entity.Property(e => e.NotificationId)
                .HasComment("Mã thông báo — khóa chính tự tăng")
                .HasColumnName("notification_id");
            entity.Property(e => e.BranchId)
                .HasComment("Chi nhánh nhận thông báo — FK tới branches.branch_id. Bắt buộc khi send_type = ByBranch, NULL trong trường hợp khác")
                .HasColumnName("branch_id");
            entity.Property(e => e.Content)
                .HasComment("Nội dung đầy đủ của thông báo")
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo thông báo")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Quản lý tạo thông báo — FK tới employees.employee_id")
                .HasColumnName("created_by");
            entity.Property(e => e.GroupId)
                .HasComment("Nhóm nhận thông báo — FK tới member_groups.group_id. Bắt buộc khi send_type = ByGroup, NULL trong trường hợp khác")
                .HasColumnName("group_id");
            entity.Property(e => e.IsSent)
                .HasComment("0 = chưa gửi, 1 = đã gửi — cập nhật bởi background job")
                .HasColumnName("is_sent");
            entity.Property(e => e.ScheduledAt)
                .HasComment("Thời điểm hẹn gửi thông báo")
                .HasColumnType("datetime")
                .HasColumnName("scheduled_at");
            entity.Property(e => e.SendType)
                .HasComment("Đối tượng nhận: All=toàn bộ hội viên, ByBranch=theo chi nhánh, ByGroup=theo nhóm")
                .HasColumnType("enum('All','ByBranch','ByGroup')")
                .HasColumnName("send_type");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasComment("Tiêu đề ngắn gọn của thông báo")
                .HasColumnName("title");

            entity.HasOne(d => d.Branch).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.BranchId)
                .HasConstraintName("fk_tb_cn");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_tb_nguoi_tao");

            entity.HasOne(d => d.Group).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.GroupId)
                .HasConstraintName("fk_tb_nhom");
        });

        modelBuilder.Entity<NotificationRecipient>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.ToTable("notification_recipients", tb => tb.HasComment("Danh sách hội viên nhận từng thông báo và trạng thái đã đọc"));

            entity.HasIndex(e => e.MemberId, "fk_nr_hv");

            entity.HasIndex(e => new { e.NotificationId, e.MemberId }, "uq_tb_hv").IsUnique();

            entity.Property(e => e.Id)
                .HasComment("Mã bản ghi — khóa chính tự tăng")
                .HasColumnName("id");
            entity.Property(e => e.IsRead)
                .HasComment("0 = chưa đọc, 1 = đã đọc — cập nhật khi hội viên mở thông báo")
                .HasColumnName("is_read");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên nhận thông báo — FK tới members.member_id")
                .HasColumnName("member_id");
            entity.Property(e => e.NotificationId)
                .HasComment("Thông báo được gửi — FK tới notifications.notification_id")
                .HasColumnName("notification_id");

            entity.HasOne(d => d.Member).WithMany(p => p.NotificationRecipients)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_nr_hv");

            entity.HasOne(d => d.Notification).WithMany(p => p.NotificationRecipients)
                .HasForeignKey(d => d.NotificationId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_nr_tb");
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

            entity.HasIndex(e => e.BranchId, "fk_gd_cn");

            entity.HasIndex(e => e.PlanId, "fk_gd_goi");

            entity.HasIndex(e => e.MemberId, "fk_gd_hv");

            entity.Property(e => e.TransactionId)
                .HasComment("Mã giao dịch — khóa chính tự tăng")
                .HasColumnName("transaction_id");
            entity.Property(e => e.Amount)
                .HasPrecision(12)
                .HasComment("Số tiền thực thu sau khi áp khuyến mãi (VNĐ). Bằng gia_goc nếu không có KM")
                .HasColumnName("amount");
            entity.Property(e => e.BranchId)
                .HasComment("Chi nhánh xử lý giao dịch — FK tới branches.branch_id")
                .HasColumnName("branch_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm tạo giao dịch")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.GiaGoc)
                .HasPrecision(12)
                .HasComment("Giá niêm yết của gói trước khi áp khuyến mãi (VNĐ)")
                .HasColumnName("gia_goc");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên thực hiện giao dịch — FK tới members.member_id")
                .HasColumnName("member_id");
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
            entity.Property(e => e.ReceiptImage)
                .HasMaxLength(500)
                .HasComment("URL ảnh biên lai / chứng từ chuyển khoản lưu trên S3")
                .HasColumnName("receipt_image");
            entity.Property(e => e.TransactionType)
                .HasComment("Loại giao dịch: NewPurchase = mua mới, Renewal = gia hạn")
                .HasColumnType("enum('NewPurchase','Renewal')")
                .HasColumnName("transaction_type");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasComment("Thời điểm cập nhật gần nhất")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Branch).WithMany(p => p.Transactions)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_gd_cn");

            entity.HasOne(d => d.Member).WithMany(p => p.Transactions)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_gd_hv");

            entity.HasOne(d => d.Plan).WithMany(p => p.Transactions)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_gd_goi");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
