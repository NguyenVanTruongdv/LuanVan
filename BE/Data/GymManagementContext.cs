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

    public virtual DbSet<Account> Accounts { get; set; }

    public virtual DbSet<Branch> Branches { get; set; }

    public virtual DbSet<BranchImage> BranchImages { get; set; }

    public virtual DbSet<CheckIn> CheckIns { get; set; }

    public virtual DbSet<Employee> Employees { get; set; }

    public virtual DbSet<EmployeeUpdateLog> EmployeeUpdateLogs { get; set; }

    public virtual DbSet<Equipment> Equipment { get; set; }

    public virtual DbSet<EquipmentCategory> EquipmentCategories { get; set; }

    public virtual DbSet<FaceDatum> FaceData { get; set; }

    public virtual DbSet<FaceUpdateHistory> FaceUpdateHistories { get; set; }

    public virtual DbSet<ForumCategory> ForumCategories { get; set; }

    public virtual DbSet<ForumComment> ForumComments { get; set; }

    public virtual DbSet<ForumCommentLike> ForumCommentLikes { get; set; }

    public virtual DbSet<ForumLike> ForumLikes { get; set; }

    public virtual DbSet<ForumNotification> ForumNotifications { get; set; }

    public virtual DbSet<ForumPost> ForumPosts { get; set; }

    public virtual DbSet<ForumPostImage> ForumPostImages { get; set; }

    public virtual DbSet<GymDensity> GymDensities { get; set; }

    public virtual DbSet<HomeImage> HomeImages { get; set; }

    public virtual DbSet<Incident> Incidents { get; set; }

    public virtual DbSet<IncidentMedia> IncidentMedias { get; set; }

    public virtual DbSet<Member> Members { get; set; }

    public virtual DbSet<MemberPackage> MemberPackages { get; set; }

    public virtual DbSet<MemberUpdateLog> MemberUpdateLogs { get; set; }

    public virtual DbSet<MembershipPlan> MembershipPlans { get; set; }

    public virtual DbSet<News> News { get; set; }

    public virtual DbSet<Otp> Otps { get; set; }

    public virtual DbSet<Promotion> Promotions { get; set; }

    public virtual DbSet<PromotionUsage> PromotionUsages { get; set; }

    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Transaction> Transactions { get; set; }

    public virtual DbSet<TransactionAdjustmentLog> TransactionAdjustmentLogs { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseMySql("server=localhost;port=3306;database=gym_management;user=root", Microsoft.EntityFrameworkCore.ServerVersion.Parse("9.1.0-mysql"));

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_0900_ai_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<Account>(entity =>
        {
            entity.HasKey(e => e.AccountId).HasName("PRIMARY");

            entity
                .ToTable("accounts")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.Email, "uq_account_email").IsUnique();

            entity.HasIndex(e => e.EmployeeId, "uq_account_employee").IsUnique();

            entity.HasIndex(e => e.MemberId, "uq_account_member").IsUnique();

            entity.HasIndex(e => e.Phone, "uq_account_phone").IsUnique();

            entity.Property(e => e.AccountId)
                .HasComment("Mã tài khoản — khóa chính tự tăng")
                .HasColumnName("account_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(150)
                .HasComment("Email, dùng khôi phục mật khẩu/nhận thông báo, có thể NULL nhưng phải duy nhất nếu có")
                .HasColumnName("email");
            entity.Property(e => e.EmployeeId)
                .HasComment("Nhân viên sở hữu tài khoản — FK tới employees.employee_id. NULL nếu đây là tài khoản hội viên")
                .HasColumnName("employee_id");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên sở hữu tài khoản — FK tới members.member_id. NULL nếu đây là tài khoản nhân viên")
                .HasColumnName("member_id");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasComment("Mật khẩu đã mã hóa bcrypt, không lưu bản rõ")
                .HasColumnName("password_hash");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasComment("Trạng thái đăng nhập: Active = được phép đăng nhập, Suspended = bị khóa")
                .HasColumnType("enum('Active','Suspended')")
                .HasColumnName("status");
            entity.Property(e => e.SuspendReason)
                .HasComment("Lý do khóa — bắt buộc điền khi status = Suspended")
                .HasColumnType("text")
                .HasColumnName("suspend_reason");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Employee).WithOne(p => p.Account)
                .HasForeignKey<Account>(d => d.EmployeeId)
                .HasConstraintName("fk_account_employee");

            entity.HasOne(d => d.Member).WithOne(p => p.Account)
                .HasForeignKey<Account>(d => d.MemberId)
                .HasConstraintName("fk_account_member");
        });

        modelBuilder.Entity<Branch>(entity =>
        {
            entity.HasKey(e => e.BranchId).HasName("PRIMARY");

            entity
                .ToTable("branches", tb => tb.HasComment("Chi nhánh phòng gym"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.Address)
                .HasColumnType("text")
                .HasColumnName("address");
            entity.Property(e => e.BranchName)
                .HasMaxLength(150)
                .HasColumnName("branch_name");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .HasColumnName("phone");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");
        });

        modelBuilder.Entity<BranchImage>(entity =>
        {
            entity.HasKey(e => e.ImageId).HasName("PRIMARY");

            entity
                .ToTable("branch_images", tb => tb.HasComment("Album ảnh các khu vực của từng chi nhánh"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.BranchId, "idx_anh_cn");

            entity.Property(e => e.ImageId).HasColumnName("image_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.ImageType)
                .HasMaxLength(100)
                .HasColumnName("image_type");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
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

            entity
                .ToTable("check_ins", tb => tb.HasComment("Lịch sử check-in / check-out của hội viên và nhân viên"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.BranchId, "fk_checkin_cn");

            entity.HasIndex(e => e.EmployeeId, "fk_checkin_employee");

            entity.HasIndex(e => e.MemberId, "fk_checkin_hv");

            entity.HasIndex(e => e.StaffId, "fk_checkin_nv");

            entity.HasIndex(e => e.MemberPackageId, "fk_checkin_package");

            entity.HasIndex(e => e.CheckOutStaffId, "fk_checkout_nv");

            entity.Property(e => e.CheckInId).HasColumnName("check_in_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CheckInTime)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("check_in_time");
            entity.Property(e => e.CheckOutManualReason)
                .HasColumnType("text")
                .HasColumnName("check_out_manual_reason");
            entity.Property(e => e.CheckOutMethod)
                .HasColumnType("enum('Auto','Manual')")
                .HasColumnName("check_out_method");
            entity.Property(e => e.CheckOutStaffId).HasColumnName("check_out_staff_id");
            entity.Property(e => e.CheckOutTime)
                .HasColumnType("datetime")
                .HasColumnName("check_out_time");
            entity.Property(e => e.EmployeeId)
                .HasComment("Nhân viên tự check-in (chấm công) — FK tới employees.employee_id. NULL nếu đây là lượt check-in của hội viên")
                .HasColumnName("employee_id");
            entity.Property(e => e.ManualReason)
                .HasColumnType("text")
                .HasColumnName("manual_reason");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên check-in — FK tới members.member_id. NULL nếu đây là lượt check-in của nhân viên")
                .HasColumnName("member_id");
            entity.Property(e => e.MemberPackageId)
                .HasComment("Gói tập được dùng để check-in — FK tới member_packages.member_package_id. NULL nếu đây là lượt check-in của nhân viên")
                .HasColumnName("member_package_id");
            entity.Property(e => e.Method)
                .HasColumnType("enum('Auto','Manual')")
                .HasColumnName("method");
            entity.Property(e => e.StaffId)
                .HasComment("Nhân viên thực hiện thao tác check-in hộ (trường hợp Manual)")
                .HasColumnName("staff_id");

            entity.HasOne(d => d.Branch).WithMany(p => p.CheckIns)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_checkin_cn");

            entity.HasOne(d => d.CheckOutStaff).WithMany(p => p.CheckInCheckOutStaffs)
                .HasForeignKey(d => d.CheckOutStaffId)
                .HasConstraintName("fk_checkout_nv");

            entity.HasOne(d => d.Employee).WithMany(p => p.CheckInEmployees)
                .HasForeignKey(d => d.EmployeeId)
                .HasConstraintName("fk_checkin_employee");

            entity.HasOne(d => d.Member).WithMany(p => p.CheckIns)
                .HasForeignKey(d => d.MemberId)
                .HasConstraintName("fk_checkin_hv");

            entity.HasOne(d => d.MemberPackage).WithMany(p => p.CheckIns)
                .HasForeignKey(d => d.MemberPackageId)
                .HasConstraintName("fk_checkin_package");

            entity.HasOne(d => d.Staff).WithMany(p => p.CheckInStaffs)
                .HasForeignKey(d => d.StaffId)
                .HasConstraintName("fk_checkin_nv");
        });

        modelBuilder.Entity<Employee>(entity =>
        {
            entity.HasKey(e => e.EmployeeId).HasName("PRIMARY");

            entity
                .ToTable("employees", tb => tb.HasComment("Hồ sơ nhân viên — thông tin đăng nhập nằm ở bảng accounts"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.CreatedBy, "fk_employee_creator");

            entity.HasIndex(e => e.RoleId, "fk_employee_role");

            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Nhân viên tạo tài khoản này — tự tham chiếu, NULL cho tài khoản khởi tạo đầu tiên")
                .HasColumnName("created_by");
            entity.Property(e => e.FullName)
                .HasMaxLength(100)
                .HasColumnName("full_name");
            entity.Property(e => e.Gender)
                .HasColumnType("enum('Male','Female','Other')")
                .HasColumnName("gender");
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .HasColumnName("phone");
            entity.Property(e => e.RoleId)
                .HasComment("FK tới roles.role_id")
                .HasColumnName("role_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasComment("Trạng thái làm việc của nhân viên: Active = đang làm việc, Inactive = đã nghỉ việc/ngưng hoạt động")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.InverseCreatedByNavigation)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("fk_employee_creator");

            entity.HasOne(d => d.Role).WithMany(p => p.Employees)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_employee_role");

            entity.HasMany(d => d.Branches).WithMany(p => p.Employees)
                .UsingEntity<Dictionary<string, object>>(
                    "EmployeeBranch",
                    r => r.HasOne<Branch>().WithMany()
                        .HasForeignKey("BranchId")
                        .HasConstraintName("fk_employee_branches_branch"),
                    l => l.HasOne<Employee>().WithMany()
                        .HasForeignKey("EmployeeId")
                        .HasConstraintName("fk_employee_branches_employee"),
                    j =>
                    {
                        j.HasKey("EmployeeId", "BranchId")
                            .HasName("PRIMARY")
                            .HasAnnotation("MySql:IndexPrefixLength", new[] { 0, 0 });
                        j
                            .ToTable("employee_branches")
                            .UseCollation("utf8mb4_unicode_ci");
                        j.HasIndex(new[] { "BranchId" }, "fk_employee_branches_branch");
                        j.IndexerProperty<long>("EmployeeId").HasColumnName("employee_id");
                        j.IndexerProperty<int>("BranchId").HasColumnName("branch_id");
                    });
        });

        modelBuilder.Entity<EmployeeUpdateLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("employee_update_logs", tb => tb.HasComment("Lịch sử cập nhật thông tin nhân viên — chỉ ghi thêm"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.UpdatedByEmployeeId, "fk_eul_updated_by");

            entity.HasIndex(e => new { e.EmployeeId, e.FieldName }, "idx_eul_employee");

            entity.HasIndex(e => e.UpdateSessionId, "idx_eul_session");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.EmployeeId)
                .HasComment("Nhân viên bị thay đổi thông tin — FK tới employees.employee_id")
                .HasColumnName("employee_id");
            entity.Property(e => e.FieldName)
                .HasMaxLength(100)
                .HasColumnName("field_name");
            entity.Property(e => e.NewValue)
                .HasColumnType("text")
                .HasColumnName("new_value");
            entity.Property(e => e.OldValue)
                .HasColumnType("text")
                .HasColumnName("old_value");
            entity.Property(e => e.UpdateSessionId).HasColumnName("update_session_id");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedByEmployeeId)
                .HasComment("Nhân viên thực hiện thay đổi — FK tới employees.employee_id")
                .HasColumnName("updated_by_employee_id");

            entity.HasOne(d => d.Employee).WithMany(p => p.EmployeeUpdateLogEmployees)
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_eul_employee");

            entity.HasOne(d => d.UpdatedByEmployee).WithMany(p => p.EmployeeUpdateLogUpdatedByEmployees)
                .HasForeignKey(d => d.UpdatedByEmployeeId)
                .HasConstraintName("fk_eul_updated_by");
        });

        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.HasKey(e => e.EquipmentId).HasName("PRIMARY");

            entity
                .ToTable("equipment", tb => tb.HasComment("Thiết bị tập luyện lắp đặt tại các chi nhánh"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.BranchId, "fk_thietbi_chinhanh");

            entity.HasIndex(e => e.CategoryId, "fk_thietbi_danhmuc");

            entity.Property(e => e.EquipmentId).HasColumnName("equipment_id");
            entity.Property(e => e.AddedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("added_at");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.EquipmentName)
                .HasMaxLength(150)
                .HasColumnName("equipment_name");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasComment("Ảnh thiết bị — quan hệ 1-1, mỗi thiết bị chỉ có 1 ảnh")
                .HasColumnName("image_url");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Deleted')")
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

            entity
                .ToTable("equipment_categories", tb => tb.HasComment("Danh mục phân loại thiết bị"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.CategoryName, "uq_ten_danh_muc").IsUnique();

            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(100)
                .HasColumnName("category_name");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
        });

        modelBuilder.Entity<FaceDatum>(entity =>
        {
            entity.HasKey(e => e.FaceDataId).HasName("PRIMARY");

            entity
                .ToTable("face_data")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.CreatedBy, "fk_face_creator");

            entity.HasIndex(e => e.EmployeeId, "uq_face_employee").IsUnique();

            entity.HasIndex(e => e.FaceIdAws, "uq_face_id_aws").IsUnique();

            entity.HasIndex(e => e.MemberId, "uq_face_member").IsUnique();

            entity.Property(e => e.FaceDataId).HasColumnName("face_data_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Nhân viên đã đăng ký/tạo faceId này — FK tới employees.employee_id")
                .HasColumnName("created_by");
            entity.Property(e => e.EmployeeId)
                .HasComment("Nhân viên sở hữu faceId — FK tới employees.employee_id. NULL nếu đây là faceId của hội viên")
                .HasColumnName("employee_id");
            entity.Property(e => e.FaceIdAws)
                .HasMaxLength(100)
                .HasColumnName("face_id_aws");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên sở hữu faceId — FK tới members.member_id. NULL nếu đây là faceId của nhân viên")
                .HasColumnName("member_id");
            entity.Property(e => e.ProfileImage)
                .HasMaxLength(500)
                .HasColumnName("profile_image");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.FaceDatumCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_face_creator");

            entity.HasOne(d => d.Employee).WithOne(p => p.FaceDatumEmployee)
                .HasForeignKey<FaceDatum>(d => d.EmployeeId)
                .HasConstraintName("fk_face_employee");

            entity.HasOne(d => d.Member).WithOne(p => p.FaceDatum)
                .HasForeignKey<FaceDatum>(d => d.MemberId)
                .HasConstraintName("fk_face_member");
        });

        modelBuilder.Entity<FaceUpdateHistory>(entity =>
        {
            entity.HasKey(e => e.HistoryId).HasName("PRIMARY");

            entity
                .ToTable("face_update_history")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.EmployeeId, "fk_facehistory_employee");

            entity.HasIndex(e => e.MemberId, "fk_facehistory_member");

            entity.HasIndex(e => e.PerformedBy, "fk_facehistory_staff");

            entity.Property(e => e.HistoryId).HasColumnName("history_id");
            entity.Property(e => e.EmployeeId)
                .HasComment("Nhân viên liên quan (chủ sở hữu faceId) — FK tới employees.employee_id. NULL nếu đây là lịch sử của hội viên")
                .HasColumnName("employee_id");
            entity.Property(e => e.MemberId)
                .HasComment("Hội viên liên quan — FK tới members.member_id. NULL nếu đây là lịch sử của nhân viên")
                .HasColumnName("member_id");
            entity.Property(e => e.NewFaceIdAws)
                .HasMaxLength(100)
                .HasColumnName("new_face_id_aws");
            entity.Property(e => e.NewProfileImage)
                .HasMaxLength(500)
                .HasColumnName("new_profile_image");
            entity.Property(e => e.OldFaceIdAws)
                .HasMaxLength(100)
                .HasColumnName("old_face_id_aws");
            entity.Property(e => e.OldProfileImage)
                .HasMaxLength(500)
                .HasColumnName("old_profile_image");
            entity.Property(e => e.PerformedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("performed_at");
            entity.Property(e => e.PerformedBy)
                .HasComment("Nhân viên thực hiện tạo/cập nhật faceId — FK tới employees.employee_id")
                .HasColumnName("performed_by");
            entity.Property(e => e.Reason)
                .HasColumnType("text")
                .HasColumnName("reason");

            entity.HasOne(d => d.Employee).WithMany(p => p.FaceUpdateHistoryEmployees)
                .HasForeignKey(d => d.EmployeeId)
                .HasConstraintName("fk_facehistory_employee");

            entity.HasOne(d => d.Member).WithMany(p => p.FaceUpdateHistories)
                .HasForeignKey(d => d.MemberId)
                .HasConstraintName("fk_facehistory_member");

            entity.HasOne(d => d.PerformedByNavigation).WithMany(p => p.FaceUpdateHistoryPerformedByNavigations)
                .HasForeignKey(d => d.PerformedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_facehistory_staff");
        });

        modelBuilder.Entity<ForumCategory>(entity =>
        {
            entity.HasKey(e => e.CategoryId).HasName("PRIMARY");

            entity
                .ToTable("forum_categories")
                .UseCollation("utf8mb4_unicode_ci");

            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(100)
                .HasColumnName("category_name");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.DisplayOrder).HasColumnName("display_order");
            entity.Property(e => e.Icon)
                .HasMaxLength(255)
                .HasColumnName("icon");
            entity.Property(e => e.Slug)
                .HasMaxLength(100)
                .HasColumnName("slug");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");
        });

        modelBuilder.Entity<ForumComment>(entity =>
        {
            entity.HasKey(e => e.CommentId).HasName("PRIMARY");

            entity
                .ToTable("forum_comments", tb => tb.HasComment("Bình luận bài viết cộng đồng, hỗ trợ trả lời 2 cấp"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.MemberId, "IX_forum_comments_member_id");

            entity.HasIndex(e => e.ParentCommentId, "IX_forum_comments_parent_comment_id");

            entity.HasIndex(e => e.PostId, "IX_forum_comments_post_id");

            entity.HasIndex(e => e.ReplyToMemberId, "IX_forum_comments_reply_to_member_id");

            entity.Property(e => e.CommentId).HasColumnName("comment_id");
            entity.Property(e => e.Content)
                .HasMaxLength(2000)
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.LikeCount).HasColumnName("like_count");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.ParentCommentId).HasColumnName("parent_comment_id");
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.ReplyToMemberId).HasColumnName("reply_to_member_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Hidden','Deleted')")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Member).WithMany(p => p.ForumCommentMembers)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_forum_comments_member");

            entity.HasOne(d => d.ParentComment).WithMany(p => p.InverseParentComment)
                .HasForeignKey(d => d.ParentCommentId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_forum_comments_parent");

            entity.HasOne(d => d.Post).WithMany(p => p.ForumComments)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("FK_forum_comments_post");

            entity.HasOne(d => d.ReplyToMember).WithMany(p => p.ForumCommentReplyToMembers)
                .HasForeignKey(d => d.ReplyToMemberId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_forum_comments_reply_to");
        });

        modelBuilder.Entity<ForumCommentLike>(entity =>
        {
            entity.HasKey(e => e.LikeId).HasName("PRIMARY");

            entity
                .ToTable("forum_comment_likes", tb => tb.HasComment("Lượt tym bình luận"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.MemberId, "IX_forum_comment_likes_member_id");

            entity.HasIndex(e => new { e.CommentId, e.MemberId }, "UQ_forum_comment_likes").IsUnique();

            entity.Property(e => e.LikeId).HasColumnName("like_id");
            entity.Property(e => e.CommentId).HasColumnName("comment_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.MemberId).HasColumnName("member_id");

            entity.HasOne(d => d.Comment).WithMany(p => p.ForumCommentLikes)
                .HasForeignKey(d => d.CommentId)
                .HasConstraintName("FK_comment_likes_comment");

            entity.HasOne(d => d.Member).WithMany(p => p.ForumCommentLikes)
                .HasForeignKey(d => d.MemberId)
                .HasConstraintName("FK_comment_likes_member");
        });

        modelBuilder.Entity<ForumLike>(entity =>
        {
            entity.HasKey(e => e.LikeId).HasName("PRIMARY");

            entity
                .ToTable("forum_likes", tb => tb.HasComment("Lượt tym bài đăng forum"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.MemberId, "idx_like_member");

            entity.HasIndex(e => new { e.PostId, e.MemberId }, "uq_like_post_member").IsUnique();

            entity.Property(e => e.LikeId).HasColumnName("like_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.PostId).HasColumnName("post_id");

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

            entity
                .ToTable("forum_notifications", tb => tb.HasComment("Thông báo tương tác trong cộng đồng"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.LikeId, "FK_notifications_like");

            entity.HasIndex(e => e.ActorMemberId, "IX_forum_notifications_actor");

            entity.HasIndex(e => e.CommentId, "IX_forum_notifications_comment");

            entity.HasIndex(e => e.PostId, "IX_forum_notifications_post");

            entity.HasIndex(e => new { e.RecipientMemberId, e.IsRead }, "IX_forum_notifications_recipient");

            entity.Property(e => e.NotificationId).HasColumnName("notification_id");
            entity.Property(e => e.ActorMemberId).HasColumnName("actor_member_id");
            entity.Property(e => e.CommentId).HasColumnName("comment_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.IsRead).HasColumnName("is_read");
            entity.Property(e => e.LikeId).HasColumnName("like_id");
            entity.Property(e => e.NotifyType)
                .HasColumnType("enum('Like','Comment','Reply')")
                .HasColumnName("notify_type");
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.RecipientMemberId).HasColumnName("recipient_member_id");

            entity.HasOne(d => d.ActorMember).WithMany(p => p.ForumNotificationActorMembers)
                .HasForeignKey(d => d.ActorMemberId)
                .HasConstraintName("FK_notifications_actor");

            entity.HasOne(d => d.Comment).WithMany(p => p.ForumNotifications)
                .HasForeignKey(d => d.CommentId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_notifications_comment");

            entity.HasOne(d => d.Like).WithMany(p => p.ForumNotifications)
                .HasForeignKey(d => d.LikeId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_notifications_like");

            entity.HasOne(d => d.Post).WithMany(p => p.ForumNotifications)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("FK_notifications_post");

            entity.HasOne(d => d.RecipientMember).WithMany(p => p.ForumNotificationRecipientMembers)
                .HasForeignKey(d => d.RecipientMemberId)
                .HasConstraintName("FK_notifications_recipient");
        });

        modelBuilder.Entity<ForumPost>(entity =>
        {
            entity.HasKey(e => e.PostId).HasName("PRIMARY");

            entity
                .ToTable("forum_posts", tb => tb.HasComment("Bài đăng cộng đồng"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.CategoryId, "idx_forum_posts_category");

            entity.HasIndex(e => new { e.MemberId, e.Status, e.CreatedAt }, "idx_post_member");

            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CommentCount).HasColumnName("comment_count");
            entity.Property(e => e.Content)
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.LikeCount).HasColumnName("like_count");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.PostType)
                .HasDefaultValueSql("'Original'")
                .HasColumnType("enum('Original','Repost')")
                .HasColumnName("post_type");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Hidden','Deleted')")
                .HasColumnName("status");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Category).WithMany(p => p.ForumPosts)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_forum_posts_category");

            entity.HasOne(d => d.Member).WithMany(p => p.ForumPosts)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_post_member");
        });

        modelBuilder.Entity<ForumPostImage>(entity =>
        {
            entity.HasKey(e => e.ImageId).HasName("PRIMARY");

            entity
                .ToTable("forum_post_images", tb => tb.HasComment("Ảnh đính kèm trong bài đăng forum"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.PostId, "idx_postimg_post");

            entity.Property(e => e.ImageId).HasColumnName("image_id");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("uploaded_at");

            entity.HasOne(d => d.Post).WithMany(p => p.ForumPostImages)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("fk_postimg_post");
        });

        modelBuilder.Entity<GymDensity>(entity =>
        {
            entity.HasKey(e => e.DensityId).HasName("PRIMARY");

            entity
                .ToTable("gym_density", tb => tb.HasComment("Snapshot mật độ người tập theo thời gian"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => new { e.BranchId, e.RecordedAt }, "idx_mat_do_cn_tg");

            entity.Property(e => e.DensityId).HasColumnName("density_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.Headcount).HasColumnName("headcount");
            entity.Property(e => e.RecordedAt)
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

            entity
                .ToTable("home_images", tb => tb.HasComment("Ảnh hiển thị trên trang chủ (banner/slideshow)"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.UploadedBy, "fk_home_img_nv");

            entity.Property(e => e.ImageId).HasColumnName("image_id");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.LinkUrl)
                .HasMaxLength(500)
                .HasColumnName("link_url");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Inactive')")
                .HasColumnName("status");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UploadedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("uploaded_at");
            entity.Property(e => e.UploadedBy).HasColumnName("uploaded_by");

            entity.HasOne(d => d.UploadedByNavigation).WithMany(p => p.HomeImages)
                .HasForeignKey(d => d.UploadedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_home_img_nv");
        });

        modelBuilder.Entity<Incident>(entity =>
        {
            entity.HasKey(e => e.IncidentId).HasName("PRIMARY");

            entity
                .ToTable("incidents", tb => tb.HasComment("Báo cáo sự cố"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.ApprovedBy, "fk_su_co_approved");

            entity.HasIndex(e => e.BranchId, "fk_su_co_cn");

            entity.HasIndex(e => e.ReportedByMemberId, "fk_su_co_hv");

            entity.HasIndex(e => e.ReportedByEmployeeId, "fk_su_co_nv");

            entity.HasIndex(e => e.EquipmentId, "fk_su_co_tb");

            entity.Property(e => e.IncidentId).HasColumnName("incident_id");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.EquipmentId).HasColumnName("equipment_id");
            entity.Property(e => e.RejectReason)
                .HasColumnType("text")
                .HasColumnName("reject_reason");
            entity.Property(e => e.ReportedByEmployeeId).HasColumnName("reported_by_employee_id");
            entity.Property(e => e.ReportedByMemberId).HasColumnName("reported_by_member_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'PendingApproval'")
                .HasColumnType("enum('PendingApproval','Approved','Completed','Cancelled')")
                .HasColumnName("status");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.IncidentApprovedByNavigations)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("fk_su_co_approved");

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

        modelBuilder.Entity<IncidentMedia>(entity =>
        {
            entity.HasKey(e => e.MediaId).HasName("PRIMARY");

            entity
                .ToTable("incident_medias")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.IncidentId, "fk_incident_media_incident");

            entity.Property(e => e.MediaId).HasColumnName("media_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.IncidentId).HasColumnName("incident_id");
            entity.Property(e => e.MediaType)
                .HasColumnType("enum('Image','Video')")
                .HasColumnName("media_type");
            entity.Property(e => e.MediaUrl)
                .HasMaxLength(1000)
                .HasColumnName("media_url");

            entity.HasOne(d => d.Incident).WithMany(p => p.IncidentMedia)
                .HasForeignKey(d => d.IncidentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_incident_media_incident");
        });

        modelBuilder.Entity<Member>(entity =>
        {
            entity.HasKey(e => e.MemberId).HasName("PRIMARY");

            entity
                .ToTable("members", tb => tb.HasComment("Hồ sơ hội viên — thông tin đăng nhập nằm ở bảng accounts"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.CreatedBy, "fk_member_creator");

            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy)
                .HasComment("Nhân viên tạo hồ sơ hội viên — FK tới employees.employee_id")
                .HasColumnName("created_by");
            entity.Property(e => e.FullName)
                .HasMaxLength(100)
                .HasColumnName("full_name");
            entity.Property(e => e.Gender)
                .HasColumnType("enum('Male','Female','Other')")
                .HasColumnName("gender");
            entity.Property(e => e.InternalNotes)
                .HasComment("Ghi chú nội bộ, hội viên không thấy")
                .HasColumnType("text")
                .HasColumnName("internal_notes");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'PendingActivation'")
                .HasComment("PendingActivation=chờ kích hoạt, Active=đang hoạt động. Việc khóa đăng nhập nay do accounts.status quản lý, không còn Expired/Suspended ở đây.")
                .HasColumnType("enum('PendingActivation','Active','Suspended')")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.Members)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("fk_member_creator");
        });

        modelBuilder.Entity<MemberPackage>(entity =>
        {
            entity.HasKey(e => e.MemberPackageId).HasName("PRIMARY");

            entity
                .ToTable("member_packages", tb => tb.HasComment("Gói tập đã mua của từng hội viên. LƯU Ý: package_status (trạng thái của gói tập cụ thể) vẫn giữ Expired — đây khác với members.status (trạng thái tài khoản hội viên nói chung), cái đã bỏ Expired theo yêu cầu."))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.BranchId, "fk_member_packages_branch");

            entity.HasIndex(e => e.MemberId, "fk_mp_member");

            entity.HasIndex(e => e.PlanId, "fk_mp_plan");

            entity.HasIndex(e => e.PromotionId, "fk_mp_promotion");

            entity.HasIndex(e => e.TransactionId, "fk_mp_transaction");

            entity.Property(e => e.MemberPackageId).HasColumnName("member_package_id");
            entity.Property(e => e.Amount)
                .HasPrecision(12)
                .HasColumnName("amount");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiryDate).HasColumnName("expiry_date");
            entity.Property(e => e.GiaGoc)
                .HasPrecision(12)
                .HasColumnName("gia_goc");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.PackageStatus)
                .HasDefaultValueSql("'PendingActivation'")
                .HasColumnType("enum('PendingActivation','Active','Expired','Cancelled')")
                .HasColumnName("package_status");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.PromotionId).HasColumnName("promotion_id");
            entity.Property(e => e.SoNgayTangThucTe).HasColumnName("so_ngay_tang_thuc_te");
            entity.Property(e => e.StartDate).HasColumnName("start_date");
            entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Branch).WithMany(p => p.MemberPackages)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_member_packages_branch");

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

            entity
                .ToTable("member_update_logs", tb => tb.HasComment("Lịch sử cập nhật thông tin hội viên — chỉ ghi thêm"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.UpdatedByEmployeeId, "fk_mul_employee");

            entity.HasIndex(e => new { e.MemberId, e.FieldName }, "idx_mul_member");

            entity.HasIndex(e => e.UpdateSessionId, "idx_mul_session");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FieldName)
                .HasMaxLength(100)
                .HasColumnName("field_name");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.NewValue)
                .HasColumnType("text")
                .HasColumnName("new_value");
            entity.Property(e => e.OldValue)
                .HasColumnType("text")
                .HasColumnName("old_value");
            entity.Property(e => e.UpdateSessionId).HasColumnName("update_session_id");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
            entity.Property(e => e.UpdatedByEmployeeId).HasColumnName("updated_by_employee_id");

            entity.HasOne(d => d.Member).WithMany(p => p.MemberUpdateLogs)
                .HasForeignKey(d => d.MemberId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_mul_member");

            entity.HasOne(d => d.UpdatedByEmployee).WithMany(p => p.MemberUpdateLogs)
                .HasForeignKey(d => d.UpdatedByEmployeeId)
                .HasConstraintName("fk_mul_employee");
        });

        modelBuilder.Entity<MembershipPlan>(entity =>
        {
            entity.HasKey(e => e.PlanId).HasName("PRIMARY");

            entity
                .ToTable("membership_plans", tb => tb.HasComment("Danh sách gói tập — không còn phân loại Customer/Internal"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasColumnType("text")
                .HasColumnName("description");
            entity.Property(e => e.DurationDays).HasColumnName("duration_days");
            entity.Property(e => e.IsPopular).HasColumnName("is_popular");
            entity.Property(e => e.PlanName)
                .HasMaxLength(150)
                .HasColumnName("plan_name");
            entity.Property(e => e.Price)
                .HasPrecision(12)
                .HasColumnName("price");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'OnSale'")
                .HasColumnType("enum('OnSale','Discontinued')")
                .HasColumnName("status");
        });

        modelBuilder.Entity<News>(entity =>
        {
            entity.HasKey(e => e.NewsId).HasName("PRIMARY");

            entity
                .ToTable("news", tb => tb.HasComment("Tin tức hiển thị cho hội viên"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.BranchId, "FK_news_branch");

            entity.HasIndex(e => e.CreatedBy, "fk_news_nv");

            entity.HasIndex(e => e.Status, "idx_news_status");

            entity.Property(e => e.NewsId).HasColumnName("news_id");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.Content)
                .HasColumnType("text")
                .HasColumnName("content");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'Active'")
                .HasColumnType("enum('Active','Hidden')")
                .HasColumnName("status");
            entity.Property(e => e.Summary)
                .HasMaxLength(500)
                .HasColumnName("summary");
            entity.Property(e => e.Title)
                .HasMaxLength(255)
                .HasColumnName("title");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Branch).WithMany(p => p.News)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_news_branch");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.News)
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_news_nv");
        });

        modelBuilder.Entity<Otp>(entity =>
        {
            entity.HasKey(e => e.OtpId).HasName("PRIMARY");

            entity
                .ToTable("otp", tb => tb.HasComment("Mã OTP xác thực một lần — dữ liệu tạm thời, không cần seed"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.ExpiresAt, "idx_otp_het_han");

            entity.HasIndex(e => new { e.Phone, e.Purpose }, "idx_otp_phone_purpose");

            entity.Property(e => e.OtpId).HasColumnName("otp_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt)
                .HasColumnType("datetime")
                .HasColumnName("expires_at");
            entity.Property(e => e.FailedAttempts).HasColumnName("failed_attempts");
            entity.Property(e => e.IsUsed).HasColumnName("is_used");
            entity.Property(e => e.OtpCode)
                .HasMaxLength(10)
                .HasColumnName("otp_code");
            entity.Property(e => e.Phone)
                .HasMaxLength(15)
                .HasColumnName("phone");
            entity.Property(e => e.Purpose)
                .HasColumnType("enum('DangKy','QuenMatKhau','DoiSoDienThoai')")
                .HasColumnName("purpose");
        });

        modelBuilder.Entity<Promotion>(entity =>
        {
            entity.HasKey(e => e.PromotionId).HasName("PRIMARY");

            entity
                .ToTable("promotions", tb => tb.HasComment("Chương trình khuyến mãi"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.NguoiTao, "fk_km_nguoi_tao");

            entity.HasIndex(e => e.PlanId, "fk_promotions_plan");

            entity.HasIndex(e => new { e.TrangThai, e.NgayBatDau, e.NgayKetThuc }, "idx_km_trangthai_thoigian");

            entity.Property(e => e.PromotionId).HasColumnName("promotion_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.GioiHanLuot).HasColumnName("gioi_han_luot");
            entity.Property(e => e.MoTa)
                .HasColumnType("text")
                .HasColumnName("mo_ta");
            entity.Property(e => e.MucGiamToiDa)
                .HasPrecision(12)
                .HasColumnName("muc_giam_toi_da");
            entity.Property(e => e.NgayBatDau)
                .HasColumnType("datetime")
                .HasColumnName("ngay_bat_dau");
            entity.Property(e => e.NgayKetThuc)
                .HasColumnType("datetime")
                .HasColumnName("ngay_ket_thuc");
            entity.Property(e => e.NguoiTao).HasColumnName("nguoi_tao");
            entity.Property(e => e.PhanTramGiam)
                .HasPrecision(5, 2)
                .HasColumnName("phan_tram_giam");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.PromoType)
                .HasColumnType("enum('GiamPhanTram','GiamTienMat','TangNgay','TangChuKy')")
                .HasColumnName("promo_type");
            entity.Property(e => e.SoChuKyTang).HasColumnName("so_chu_ky_tang");
            entity.Property(e => e.SoLuotDaDung).HasColumnName("so_luot_da_dung");
            entity.Property(e => e.SoNgayTang).HasColumnName("so_ngay_tang");
            entity.Property(e => e.SoTienGiam)
                .HasPrecision(12)
                .HasColumnName("so_tien_giam");
            entity.Property(e => e.TenKhuyenMai)
                .HasMaxLength(200)
                .HasColumnName("ten_khuyen_mai");
            entity.Property(e => e.TrangThai)
                .HasDefaultValueSql("'HoatDong'")
                .HasColumnType("enum('HoatDong','TamDung','HetHan')")
                .HasColumnName("trang_thai");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.NguoiTaoNavigation).WithMany(p => p.Promotions)
                .HasForeignKey(d => d.NguoiTao)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_km_nguoi_tao");

            entity.HasOne(d => d.Plan).WithMany(p => p.Promotions)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_promotions_plan");
        });

        modelBuilder.Entity<PromotionUsage>(entity =>
        {
            entity.HasKey(e => e.UsageId).HasName("PRIMARY");

            entity
                .ToTable("promotion_usages", tb => tb.HasComment("Lịch sử áp dụng khuyến mãi"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.PlanId, "fk_su_dung_goi");

            entity.HasIndex(e => e.MemberId, "fk_su_dung_hv");

            entity.HasIndex(e => e.PromotionId, "fk_su_dung_km");

            entity.HasIndex(e => e.MemberPackageId, "uq_su_dung_package").IsUnique();

            entity.Property(e => e.UsageId).HasColumnName("usage_id");
            entity.Property(e => e.ApDungLuc)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("ap_dung_luc");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.MemberPackageId).HasColumnName("member_package_id");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.PromotionId).HasColumnName("promotion_id");
            entity.Property(e => e.SoNgayDuocTang).HasColumnName("so_ngay_duoc_tang");
            entity.Property(e => e.SoTienDaGiam)
                .HasPrecision(12)
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

            entity
                .ToTable("refresh_tokens", tb => tb.HasComment("Refresh token — dữ liệu tạm thời, không cần seed"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.AccountId, "idx_rt_account");

            entity.HasIndex(e => e.TokenHash, "uq_token_hash").IsUnique();

            entity.Property(e => e.TokenId).HasColumnName("token_id");
            entity.Property(e => e.AccountId)
                .HasComment("Tài khoản sở hữu token — FK tới accounts.account_id")
                .HasColumnName("account_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt)
                .HasColumnType("datetime")
                .HasColumnName("expires_at");
            entity.Property(e => e.RevokedAt)
                .HasColumnType("datetime")
                .HasColumnName("revoked_at");
            entity.Property(e => e.Role)
                .HasMaxLength(50)
                .HasComment("Role tại thời điểm đăng nhập, VD: Member, Staff, Manager, Admin")
                .HasColumnName("role");
            entity.Property(e => e.TokenHash).HasColumnName("token_hash");

            entity.HasOne(d => d.Account).WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.AccountId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_rt_account");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.RoleId).HasName("PRIMARY");

            entity
                .ToTable("roles", tb => tb.HasComment("Vai trò của nhân viên"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.RoleName, "uq_role_name").IsUnique();

            entity.Property(e => e.RoleId)
                .HasComment("Mã vai trò")
                .HasColumnName("role_id");
            entity.Property(e => e.RoleName)
                .HasMaxLength(50)
                .HasComment("Tên vai trò: Staff, Manager, Admin")
                .HasColumnName("role_name");
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.HasKey(e => e.TransactionId).HasName("PRIMARY");

            entity
                .ToTable("transactions", tb => tb.HasComment("Giao dịch thanh toán mua hoặc gia hạn gói tập"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.BankReferenceCode, "UX_Transactions_BankReferenceCode").IsUnique();

            entity.HasIndex(e => e.PlanId, "fk_gd_goi");

            entity.HasIndex(e => e.MemberId, "fk_gd_hv");

            entity.HasIndex(e => e.PromotionId, "fk_transaction_promotion");

            entity.HasIndex(e => e.BranchId, "fk_transactions_branch");

            entity.HasIndex(e => e.EmployeeId, "fk_transactions_employee");

            entity.HasIndex(e => e.OrderCode, "order_code").IsUnique();

            entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
            entity.Property(e => e.Amount)
                .HasPrecision(12)
                .HasColumnName("amount");
            entity.Property(e => e.BankReferenceCode)
                .HasMaxLength(100)
                .HasColumnName("bank_reference_code");
            entity.Property(e => e.BranchId).HasColumnName("branch_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.EmployeeId).HasColumnName("employee_id");
            entity.Property(e => e.GiaGoc)
                .HasPrecision(12)
                .HasColumnName("gia_goc");
            entity.Property(e => e.MemberId).HasColumnName("member_id");
            entity.Property(e => e.OrderCode)
                .HasMaxLength(50)
                .HasColumnName("order_code");
            entity.Property(e => e.PaymentMethod)
                .HasColumnType("enum('Cash','BankTransfer')")
                .HasColumnName("payment_method");
            entity.Property(e => e.PaymentStatus)
                .HasDefaultValueSql("'Pending'")
                .HasColumnType("enum('Pending','Paid','Cancelled')")
                .HasColumnName("payment_status");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.PromotionId).HasColumnName("promotion_id");
            entity.Property(e => e.ReceiptImage)
                .HasMaxLength(500)
                .HasColumnName("receipt_image");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Branch).WithMany(p => p.Transactions)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_transactions_branch");

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

        modelBuilder.Entity<TransactionAdjustmentLog>(entity =>
        {
            entity.HasKey(e => e.AdjustmentId).HasName("PRIMARY");

            entity
                .ToTable("transaction_adjustment_logs", tb => tb.HasComment("Lịch sử chỉnh sửa giao dịch — không cần seed"))
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.AdjustedBy, "fk_adjustment_employee");

            entity.HasIndex(e => e.NewPlanId, "fk_adjustment_new_plan");

            entity.HasIndex(e => e.NewPromotionId, "fk_adjustment_new_promotion");

            entity.HasIndex(e => e.OldPlanId, "fk_adjustment_old_plan");

            entity.HasIndex(e => e.OldPromotionId, "fk_adjustment_old_promotion");

            entity.HasIndex(e => e.TransactionId, "fk_adjustment_transaction");

            entity.Property(e => e.AdjustmentId).HasColumnName("adjustment_id");
            entity.Property(e => e.AdjustedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("adjusted_at");
            entity.Property(e => e.AdjustedBy).HasColumnName("adjusted_by");
            entity.Property(e => e.NewAmount)
                .HasPrecision(18, 2)
                .HasColumnName("new_amount");
            entity.Property(e => e.NewGiaGoc)
                .HasPrecision(18, 2)
                .HasColumnName("new_gia_goc");
            entity.Property(e => e.NewPlanId).HasColumnName("new_plan_id");
            entity.Property(e => e.NewPromotionId).HasColumnName("new_promotion_id");
            entity.Property(e => e.OldAmount)
                .HasPrecision(18, 2)
                .HasColumnName("old_amount");
            entity.Property(e => e.OldGiaGoc)
                .HasPrecision(18, 2)
                .HasColumnName("old_gia_goc");
            entity.Property(e => e.OldPlanId).HasColumnName("old_plan_id");
            entity.Property(e => e.OldPromotionId).HasColumnName("old_promotion_id");
            entity.Property(e => e.Reason)
                .HasMaxLength(500)
                .HasColumnName("reason");
            entity.Property(e => e.TransactionId).HasColumnName("transaction_id");

            entity.HasOne(d => d.AdjustedByNavigation).WithMany(p => p.TransactionAdjustmentLogs)
                .HasForeignKey(d => d.AdjustedBy)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_adjustment_employee");

            entity.HasOne(d => d.NewPlan).WithMany(p => p.TransactionAdjustmentLogNewPlans)
                .HasForeignKey(d => d.NewPlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_adjustment_new_plan");

            entity.HasOne(d => d.NewPromotion).WithMany(p => p.TransactionAdjustmentLogNewPromotions)
                .HasForeignKey(d => d.NewPromotionId)
                .HasConstraintName("fk_adjustment_new_promotion");

            entity.HasOne(d => d.OldPlan).WithMany(p => p.TransactionAdjustmentLogOldPlans)
                .HasForeignKey(d => d.OldPlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_adjustment_old_plan");

            entity.HasOne(d => d.OldPromotion).WithMany(p => p.TransactionAdjustmentLogOldPromotions)
                .HasForeignKey(d => d.OldPromotionId)
                .HasConstraintName("fk_adjustment_old_promotion");

            entity.HasOne(d => d.Transaction).WithMany(p => p.TransactionAdjustmentLogs)
                .HasForeignKey(d => d.TransactionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("fk_adjustment_transaction");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
