using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Hubs;
using ProposalGovernance.Api.Repositories;
using ProposalGovernance.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Database configuration (SQL Server)
builder.Services.AddDbContext<GovernanceDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Dependency Injection - Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IProposalRepository, ProposalRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<ICapitalRepository, CapitalRepository>();
builder.Services.AddScoped<IInvestmentRepository, InvestmentRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<ISocialRepository, SocialRepository>();
builder.Services.AddScoped<IMarketplaceRepository, MarketplaceRepository>();
builder.Services.AddScoped<IDiscussionRepository, DiscussionRepository>();

// Dependency Injection - Services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSingleton<IEmailService, EmailService>(); // Singleton to keep sandbox logs in memory if needed (writes to file anyway)
builder.Services.AddHttpClient(); // Generic HttpClient registration
builder.Services.AddScoped<IAiAnalysisService, AiAnalysisService>();
builder.Services.AddHttpClient<AiAnalysisService>(); // HttpClient for Gemini API calls
builder.Services.AddScoped<IPatentVerificationService, PatentVerificationService>();
builder.Services.AddHttpClient<PatentVerificationService>(); // HttpClient for Patent Verification API/Gemini calls


// New Scoped Services
builder.Services.AddScoped<IPaymentService, RazorpayPaymentService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<ITrustScoreService, TrustScoreService>();
builder.Services.AddScoped<INdaService, NdaService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IVisibilityScoreService, VisibilityScoreService>();

// SignalR for real-time notifications
builder.Services.AddSignalR();

// Swagger UI and OpenAPI generation setup
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Proposal Governance API",
        Version = "v1",
        Description = "API documentation for the Proposal Governance Platform."
    });

    // Configure JWT authentication for Swagger
    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "JWT Authentication",
        Description = "Enter JWT Bearer token **_only_**",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    };
    c.AddSecurityDefinition("Bearer", securityScheme);
    c.AddSecurityRequirement((document) => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", document),
            new List<string>()
        }
    });
});

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
        policy.WithOrigins(
                  "http://localhost:5173", "http://127.0.0.1:5173",
                  "http://localhost:5174", "http://127.0.0.1:5174",
                  "http://localhost:5175", "http://127.0.0.1:5175",
                  "http://localhost:5176", "http://127.0.0.1:5176") // React dev ports
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
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Proposal Governance API v1");
        c.RoutePrefix = "swagger"; // Standard URL path: http://localhost:5031/swagger
    });
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
        context.Database.Migrate(); // Applies any pending migrations for the context to the database

        // ── Seed platform config defaults if empty ────────────────────────────
        if (!context.PlatformConfigs.Any())
        {
            context.PlatformConfigs.AddRange(
                new ProposalGovernance.Api.Models.PlatformConfig { Key = "MaxReviewerConsultations", Value = "5", Description = "Default number of reviewer consultations per premium subscription cycle.", UpdatedAt = DateTime.UtcNow },
                new ProposalGovernance.Api.Models.PlatformConfig { Key = "AIAssistantEnabled", Value = "true", Description = "Enable or disable the premium AI assistant feature.", UpdatedAt = DateTime.UtcNow },
                new ProposalGovernance.Api.Models.PlatformConfig { Key = "PremiumConsultationEnabled", Value = "true", Description = "Enable or disable the premium reviewer consultation feature.", UpdatedAt = DateTime.UtcNow },
                new ProposalGovernance.Api.Models.PlatformConfig { Key = "FeaturedStartupBenefitsEnabled", Value = "true", Description = "Enable or disable featured startup listing benefits for premium subscribers.", UpdatedAt = DateTime.UtcNow }
            );
            context.SaveChanges();
        }

        // Seed plans if table is empty
        if (!context.Subscriptions.Any())
        {
            context.Subscriptions.AddRange(
                new ProposalGovernance.Api.Models.Subscription
                {
                    Id = 1, Name = "Founder Free", UserRole = "Founder",
                    Price = 0.00m, DurationInDays = 9999, IsActive = true,
                    Description = "Standard listing and interest requests."
                },
                new ProposalGovernance.Api.Models.Subscription
                {
                    Id = 2, Name = "Founder Premium", UserRole = "Founder",
                    Price = 4999.00m, DurationInDays = 30, IsActive = true,
                    Description = "Priority listing, visibility boost, verified badge, and priority consultation."
                },
                new ProposalGovernance.Api.Models.Subscription
                {
                    Id = 3, Name = "Investor Free", UserRole = "Investor",
                    Price = 0.00m, DurationInDays = 9999, IsActive = true,
                    Description = "Standard browse, view public proposals, and request access."
                },
                new ProposalGovernance.Api.Models.Subscription
                {
                    Id = 4, Name = "Investor Premium", UserRole = "Investor",
                    Price = 9999.00m, DurationInDays = 30, IsActive = true,
                    Description = "Advanced filters, comparisons, risk reports, and trust breakdown."
                }
            );
            context.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred creating the DB schema.");
    }
}

app.Run();

