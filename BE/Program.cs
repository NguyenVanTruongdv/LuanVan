using Amazon;
using Amazon.Rekognition;
using Amazon.S3;
using BE.Data;
using BE.Helpers;
using BE.Models;
using BE.Services;
using BE.Services.FaceRecognition;
using BE.Services.GymDensity;
using BE.Services.Identify;

// using BE.Services.Identify;
using BE.Services.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database
builder.Services.AddDbContext<GymManagementContext>(options =>
{
    var connectionString =
        builder.Configuration.GetConnectionString("DefaultConnection");

    options.UseMySql(
        connectionString,
        new MySqlServerVersion(new Version(8, 4, 0)),
        mysqlOptions =>
        {
            mysqlOptions.EnableRetryOnFailure();
        });
});

// HttpClient
builder.Services.AddHttpClient();

// ===================== AWS =====================
// QUAN TRỌNG: cả S3 và Rekognition đều tạo THỦ CÔNG bằng AccessKey/SecretKey đọc từ
// appsettings.json (mục "AWS"). KHÔNG dùng builder.Services.AddAWSService<T>() vì
// method đó mặc định đi tìm credentials theo default credential chain (biến môi trường,
// file ~/.aws/credentials, EC2 metadata...) — không đọc "AWS:AccessKey"/"AWS:SecretKey"
// trong config của mình, nên sẽ báo lỗi "Failed to resolve AWS credentials".
builder.Services.AddSingleton<IAmazonS3>(sp =>
{
    var config = builder.Configuration;
    var region = RegionEndpoint.GetBySystemName(config["AWS:Region"]);

    return new AmazonS3Client(
        config["AWS:AccessKey"],
        config["AWS:SecretKey"],
        region
    );
});

builder.Services.AddSingleton<IAmazonRekognition>(sp =>
{
    var config = builder.Configuration;
    var region = RegionEndpoint.GetBySystemName(config["AWS:Region"]);

    return new AmazonRekognitionClient(
        config["AWS:AccessKey"],
        config["AWS:SecretKey"],
        region
    );
});

// Dependency Injection
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<SmsService>();
builder.Services.AddScoped<NewsService>();

builder.Services.AddScoped<PaymentService>();
builder.Services.AddScoped<TransactionService>();
builder.Services.AddScoped<HomeImageService>();
builder.Services.AddScoped<EquipmentCategoryService>();
builder.Services.AddScoped<EquipmentService>();
builder.Services.AddScoped<BranchService>();
builder.Services.AddScoped<BranchImageService>();
builder.Services.AddScoped<FaceIdService>();
builder.Services.AddScoped<MemberService>();
builder.Services.AddScoped<MembershipPlanService>();
builder.Services.AddScoped<MemberPackageService>();
builder.Services.AddScoped<IdentifyService>();
builder.Services.AddScoped<GymDensityService>();
builder.Services.AddScoped<PromotionService>();
builder.Services.AddScoped<EmployeeService>();
builder.Services.AddScoped<IncidentService>();
builder.Services.AddScoped<S3StorageService>(); // chỗ lưu file và ảnh trên s3
builder.Services.AddScoped<InvoiceService>(); // tạo hóa pdf
builder.Services.AddScoped<ReportService>();
builder.Services.AddScoped<ThongKeService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<AccountService>();
// forum 
builder.Services.AddScoped<ForumCategoryService>();
builder.Services.AddScoped<ForumPostService>();
builder.Services.AddScoped<ForumLikeService>();
builder.Services.AddScoped<ForumCommentService>();
builder.Services.AddScoped<ForumNotificationService>();

builder.Services.AddHttpClient();
builder.Services.AddScoped<TransactionService>();
builder.Services.AddScoped<RekognitionFaceService>();


builder.Services.AddScoped(sp => new Lazy<RekognitionFaceService>(() => sp.GetRequiredService<RekognitionFaceService>()));

builder.Services.AddScoped<JwtHelper>();

// JWT Authentication
builder.Services.AddAuthentication(
    JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
    options.TokenValidationParameters =
        new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],

            IssuerSigningKey =
                new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(
                        builder.Configuration["Jwt:Key"]!))
        };
});

// Authorization
builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Response Compression
builder.Services.AddResponseCompression();

var app = builder.Build();

app.UseResponseCompression();

// Global Exception Middleware
app.UseMiddleware<BE.Middleware.ExceptionMiddleware>();

app.UseCors("AllowAll");

// Swagger
app.UseSwagger();
app.UseSwaggerUI();

if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

// Authentication
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();