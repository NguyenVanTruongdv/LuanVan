using System.Text;
using BE.Data;
using BE.Helpers;
using BE.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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
builder.Services.AddHttpClient();

// Dependency Injection
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<SmsService>();
builder.Services.AddScoped<NewsService>();
builder.Services.AddScoped<PackageService>();
builder.Services.AddScoped<PaymentService>();
builder.Services.AddScoped<HomeImageService>();
builder.Services.AddScoped<EquipmentCategoryService>();
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

            ValidIssuer =
                builder.Configuration["Jwt:Issuer"],

            ValidAudience =
                builder.Configuration["Jwt:Audience"],

            IssuerSigningKey =
                new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(
                        builder.Configuration["Jwt:Key"]!))
        };
});

// Authorization
builder.Services.AddAuthorization();
// Thêm sau dòng builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
builder.Services.AddResponseCompression();
var app = builder.Build();
app.UseResponseCompression();
// Global Exception Middleware
app.UseMiddleware<BE.Middleware.ExceptionMiddleware>();
app.UseCors("AllowAll"); // ← thêm dòng này

// Swagger

app.UseSwagger();
app.UseSwaggerUI();


if (!app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

// JWT Middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();