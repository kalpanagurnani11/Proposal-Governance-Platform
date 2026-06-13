using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Hubs;
using ProposalGovernance.Api.Repositories;
using ProposalGovernance.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Database configuration (SQLite)
builder.Services.AddDbContext<GovernanceDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=governance.db"));

// Dependency Injection - Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IProposalRepository, ProposalRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<ICapitalRepository, CapitalRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();

// Dependency Injection - Services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<IEmailService, EmailService>(); // Singleton to keep mock logs in memory if needed (writes to file anyway)
builder.Services.AddScoped<IAiAnalysisService, AiAnalysisService>();

// SignalR for real-time notifications
builder.Services.AddSignalR();

// JWT Authentication configuration
var jwtKey = builder.Configuration["Jwt:Key"] ?? "SuperSecretGovernancePlatformKey2026!$PleaseChangeInProduction";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "ProposalGovernanceApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "ProposalGovernanceClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };

    // Custom logic to read SignalR token from query string
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173") // React dev port
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Required for SignalR
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseStaticFiles(); // Serve static assets (e.g. uploaded proposal PDFs)

app.UseRouting();

app.UseCors("CorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

// Automatically perform migrations and database check/creation on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<GovernanceDbContext>();
        context.Database.EnsureCreated(); // Creates DB schema if it doesn't exist
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred creating the DB schema.");
    }
}

app.Run();
