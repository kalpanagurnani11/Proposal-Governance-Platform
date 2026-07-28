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

// Database configuration (SQLite)
builder.Services.AddDbContext<GovernanceDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=governance.db"));

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
builder.Services.AddSingleton<IEmailService, EmailService>(); // Singleton to keep mock logs in memory if needed (writes to file anyway)
builder.Services.AddHttpClient(); // Generic HttpClient registration
builder.Services.AddScoped<IAiAnalysisService, AiAnalysisService>();
builder.Services.AddHttpClient<AiAnalysisService>(); // HttpClient for Gemini API calls
builder.Services.AddScoped<IPatentVerificationService, PatentVerificationService>();
builder.Services.AddHttpClient<PatentVerificationService>(); // HttpClient for Patent Verification API/Gemini calls


// New Scoped Services
builder.Services.AddScoped<IPaymentService, MockPaymentService>();
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
        context.Database.EnsureCreated(); // Creates DB schema if it doesn't exist

        // Ensure Subscriptions table exists (may be missing in older DBs that pre-date this feature)
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""Subscriptions"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Subscriptions"" PRIMARY KEY AUTOINCREMENT,
                ""Name"" TEXT NOT NULL,
                ""UserRole"" TEXT NOT NULL,
                ""Price"" TEXT NOT NULL,
                ""DurationInDays"" INTEGER NOT NULL,
                ""Description"" TEXT NOT NULL,
                ""IsActive"" INTEGER NOT NULL DEFAULT 1
            );
        ");

        // Ensure UserSubscriptions table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""UserSubscriptions"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_UserSubscriptions"" PRIMARY KEY AUTOINCREMENT,
                ""UserId"" INTEGER NOT NULL,
                ""SubscriptionId"" INTEGER NOT NULL,
                ""StartDate"" TEXT NOT NULL,
                ""EndDate"" TEXT NOT NULL,
                ""Status"" TEXT NOT NULL,
                ""PaymentId"" TEXT NOT NULL,
                CONSTRAINT ""FK_UserSubscriptions_Subscriptions_SubscriptionId"" FOREIGN KEY (""SubscriptionId"") REFERENCES ""Subscriptions"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_UserSubscriptions_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Ensure Payments table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""Payments"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_Payments"" PRIMARY KEY AUTOINCREMENT,
                ""UserId"" INTEGER NOT NULL,
                ""Amount"" TEXT NOT NULL,
                ""PaymentType"" TEXT NOT NULL,
                ""Status"" TEXT NOT NULL,
                ""TransactionReference"" TEXT NOT NULL,
                ""CreatedAt"" TEXT NOT NULL,
                CONSTRAINT ""FK_Payments_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Ensure FeaturedListings table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""FeaturedListings"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_FeaturedListings"" PRIMARY KEY AUTOINCREMENT,
                ""StartupId"" INTEGER NOT NULL,
                ""UserId"" INTEGER NOT NULL,
                ""StartDate"" TEXT NOT NULL,
                ""EndDate"" TEXT NOT NULL,
                ""Status"" TEXT NOT NULL,
                CONSTRAINT ""FK_FeaturedListings_Proposals_StartupId"" FOREIGN KEY (""StartupId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_FeaturedListings_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Ensure ProposalAccessRequests table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""ProposalAccessRequests"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_ProposalAccessRequests"" PRIMARY KEY AUTOINCREMENT,
                ""StartupId"" INTEGER NOT NULL,
                ""InvestorId"" INTEGER NOT NULL,
                ""Status"" TEXT NOT NULL,
                ""RequestedAt"" TEXT NOT NULL,
                ""ApprovedAt"" TEXT NULL,
                CONSTRAINT ""FK_ProposalAccessRequests_Proposals_StartupId"" FOREIGN KEY (""StartupId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_ProposalAccessRequests_Users_InvestorId"" FOREIGN KEY (""InvestorId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Ensure NDAAgreements table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""NDAAgreements"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_NDAAgreements"" PRIMARY KEY AUTOINCREMENT,
                ""StartupId"" INTEGER NOT NULL,
                ""InvestorId"" INTEGER NOT NULL,
                ""AcceptedAt"" TEXT NOT NULL,
                ""IpAddress"" TEXT NOT NULL,
                ""Version"" TEXT NOT NULL,
                CONSTRAINT ""FK_NDAAgreements_Proposals_StartupId"" FOREIGN KEY (""StartupId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_NDAAgreements_Users_InvestorId"" FOREIGN KEY (""InvestorId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Ensure ProposalViews table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""ProposalViews"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_ProposalViews"" PRIMARY KEY AUTOINCREMENT,
                ""ProposalId"" INTEGER NOT NULL,
                ""UserId"" INTEGER NULL,
                ""ViewedAt"" TEXT NOT NULL,
                ""IpAddress"" TEXT NULL,
                CONSTRAINT ""FK_ProposalViews_Proposals_ProposalId"" FOREIGN KEY (""ProposalId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_ProposalViews_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL
            );
        ");

        // Ensure DocumentDownloads table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""DocumentDownloads"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_DocumentDownloads"" PRIMARY KEY AUTOINCREMENT,
                ""ProposalId"" INTEGER NOT NULL,
                ""UserId"" INTEGER NOT NULL,
                ""DocumentType"" TEXT NOT NULL,
                ""DocumentName"" TEXT NOT NULL,
                ""DownloadedAt"" TEXT NOT NULL,
                ""WatermarkText"" TEXT NOT NULL,
                ""IpAddress"" TEXT NULL,
                CONSTRAINT ""FK_DocumentDownloads_Proposals_ProposalId"" FOREIGN KEY (""ProposalId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_DocumentDownloads_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Ensure StartupPatentInfos table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""StartupPatentInfos"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_StartupPatentInfos"" PRIMARY KEY AUTOINCREMENT,
                ""StartupId"" INTEGER NOT NULL,
                ""PatentStatus"" TEXT NOT NULL,
                ""PatentNumber"" TEXT NULL,
                ""FilingDate"" TEXT NULL,
                ""PatentDocumentUrl"" TEXT NULL,
                ""LastCheckedAt"" TEXT NOT NULL,
                ""VerificationStatus"" TEXT NOT NULL,
                ""VerifiedById"" INTEGER NULL,
                CONSTRAINT ""FK_StartupPatentInfos_Proposals_StartupId"" FOREIGN KEY (""StartupId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_StartupPatentInfos_Users_VerifiedById"" FOREIGN KEY (""VerifiedById"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL
            );
        ");

        // Ensure PatentCheckResults table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""PatentCheckResults"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_PatentCheckResults"" PRIMARY KEY AUTOINCREMENT,
                ""StartupId"" INTEGER NOT NULL,
                ""PatentRiskLevel"" TEXT NOT NULL,
                ""SimilarPatentCount"" INTEGER NOT NULL,
                ""MatchPercentage"" TEXT NOT NULL,
                ""LastCheckedAt"" TEXT NOT NULL,
                ""DetailsJson"" TEXT NULL,
                CONSTRAINT ""FK_PatentCheckResults_Proposals_StartupId"" FOREIGN KEY (""StartupId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Ensure StartupTrustScores table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""StartupTrustScores"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_StartupTrustScores"" PRIMARY KEY AUTOINCREMENT,
                ""StartupId"" INTEGER NOT NULL,
                ""TrustScore"" INTEGER NOT NULL,
                ""TrustLevel"" TEXT NOT NULL,
                ""LastUpdated"" TEXT NOT NULL,
                ""BreakdownJson"" TEXT NULL,
                CONSTRAINT ""FK_StartupTrustScores_Proposals_StartupId"" FOREIGN KEY (""StartupId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE
            );
        ");

        // Ensure FounderVerifications table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""FounderVerifications"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_FounderVerifications"" PRIMARY KEY AUTOINCREMENT,
                ""UserId"" INTEGER NOT NULL,
                ""VerificationLevel"" TEXT NOT NULL,
                ""EmailVerified"" INTEGER NOT NULL,
                ""MobileVerified"" INTEGER NOT NULL,
                ""PanVerified"" INTEGER NOT NULL,
                ""PanNumber"" TEXT NULL,
                ""AadhaarVerified"" INTEGER NOT NULL,
                ""AadhaarNumber"" TEXT NULL,
                ""LinkedInVerified"" INTEGER NOT NULL,
                ""LinkedInUrl"" TEXT NULL,
                ""GstVerified"" INTEGER NOT NULL,
                ""GstNumber"" TEXT NULL,
                ""CompanyRegVerified"" INTEGER NOT NULL,
                ""RegistrationNumber"" TEXT NULL,
                ""CinVerified"" INTEGER NOT NULL,
                ""CinNumber"" TEXT NULL,
                ""DocumentUrl"" TEXT NULL,
                ""Status"" TEXT NOT NULL,
                ""CheckedById"" INTEGER NULL,
                ""CheckedAt"" TEXT NULL,
                ""Notes"" TEXT NULL,
                CONSTRAINT ""FK_FounderVerifications_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_FounderVerifications_Users_CheckedById"" FOREIGN KEY (""CheckedById"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL
            );
        ");

        // Ensure StartupVerifications table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""StartupVerifications"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_StartupVerifications"" PRIMARY KEY AUTOINCREMENT,
                ""StartupId"" INTEGER NOT NULL,
                ""RegistrationCertificateStatus"" TEXT NOT NULL,
                ""RegistrationCertificateUrl"" TEXT NULL,
                ""GstDocumentStatus"" TEXT NOT NULL,
                ""GstDocumentUrl"" TEXT NULL,
                ""PanDocumentStatus"" TEXT NOT NULL,
                ""PanDocumentUrl"" TEXT NULL,
                ""FinancialStatementsStatus"" TEXT NOT NULL,
                ""FinancialStatementsUrl"" TEXT NULL,
                ""PitchDeckStatus"" TEXT NOT NULL,
                ""PitchDeckUrl"" TEXT NULL,
                ""OverallStatus"" TEXT NOT NULL,
                ""VerifiedById"" INTEGER NULL,
                ""VerifiedAt"" TEXT NULL,
                ""Notes"" TEXT NULL,
                CONSTRAINT ""FK_StartupVerifications_Proposals_StartupId"" FOREIGN KEY (""StartupId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_StartupVerifications_Users_VerifiedById"" FOREIGN KEY (""VerifiedById"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL
            );
        ");

        // Ensure AuditLogs table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""AuditLogs"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_AuditLogs"" PRIMARY KEY AUTOINCREMENT,
                ""UserId"" INTEGER NULL,
                ""Username"" TEXT NULL,
                ""Action"" TEXT NOT NULL,
                ""EntityName"" TEXT NULL,
                ""EntityId"" INTEGER NULL,
                ""Details"" TEXT NULL,
                ""CreatedAt"" TEXT NOT NULL,
                ""IpAddress"" TEXT NULL,
                CONSTRAINT ""FK_AuditLogs_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL
            );
        ");

        // Ensure DueDiligenceReports table exists
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""DueDiligenceReports"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_DueDiligenceReports"" PRIMARY KEY AUTOINCREMENT,
                ""StartupId"" INTEGER NOT NULL,
                ""ReviewerId"" INTEGER NOT NULL,
                ""InnovationScore"" INTEGER NOT NULL,
                ""MarketPotentialScore"" INTEGER NOT NULL,
                ""FeasibilityScore"" INTEGER NOT NULL,
                ""TeamStrengthScore"" INTEGER NOT NULL,
                ""FinancialReadinessScore"" INTEGER NOT NULL,
                ""RiskAssessmentScore"" INTEGER NOT NULL,
                ""PatentStrengthScore"" INTEGER NOT NULL,
                ""IpStrengthScore"" INTEGER NOT NULL,
                ""Summary"" TEXT NOT NULL,
                ""CreatedAt"" TEXT NOT NULL,
                CONSTRAINT ""FK_DueDiligenceReports_Proposals_StartupId"" FOREIGN KEY (""StartupId"") REFERENCES ""Proposals"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_DueDiligenceReports_Users_ReviewerId"" FOREIGN KEY (""ReviewerId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
        ");

        // ── New Subscription Extension Tables ────────────────────────────────
        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""AIAssistantLogs"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_AIAssistantLogs"" PRIMARY KEY AUTOINCREMENT,
                ""UserId"" INTEGER NOT NULL,
                ""UserRole"" TEXT NOT NULL,
                ""Prompt"" TEXT NOT NULL,
                ""ResponseSummary"" TEXT NULL,
                ""CreatedAt"" TEXT NOT NULL,
                CONSTRAINT ""FK_AIAssistantLogs_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
        ");

        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""ConsultationRequests"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_ConsultationRequests"" PRIMARY KEY AUTOINCREMENT,
                ""UserId"" INTEGER NOT NULL,
                ""ReviewerId"" INTEGER NULL,
                ""StartupId"" INTEGER NULL,
                ""ConsultationType"" TEXT NOT NULL,
                ""Subject"" TEXT NOT NULL,
                ""Description"" TEXT NOT NULL,
                ""Status"" TEXT NOT NULL DEFAULT 'Pending',
                ""RequestedAt"" TEXT NOT NULL,
                ""AcceptedAt"" TEXT NULL,
                ""CompletedAt"" TEXT NULL,
                ""Rating"" INTEGER NULL,
                ""Feedback"" TEXT NULL,
                CONSTRAINT ""FK_ConsultationRequests_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_ConsultationRequests_Users_ReviewerId"" FOREIGN KEY (""ReviewerId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL,
                CONSTRAINT ""FK_ConsultationRequests_Proposals_StartupId"" FOREIGN KEY (""StartupId"") REFERENCES ""Proposals"" (""Id"") ON DELETE SET NULL
            );
        ");

        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""ConsultationMessages"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_ConsultationMessages"" PRIMARY KEY AUTOINCREMENT,
                ""ConsultationId"" INTEGER NOT NULL,
                ""SenderId"" INTEGER NOT NULL,
                ""Content"" TEXT NULL,
                ""FileUrl"" TEXT NULL,
                ""FileType"" TEXT NULL,
                ""FileName"" TEXT NULL,
                ""IsRead"" INTEGER NOT NULL DEFAULT 0,
                ""SentAt"" TEXT NOT NULL,
                CONSTRAINT ""FK_ConsultationMessages_ConsultationRequests_ConsultationId"" FOREIGN KEY (""ConsultationId"") REFERENCES ""ConsultationRequests"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_ConsultationMessages_Users_SenderId"" FOREIGN KEY (""SenderId"") REFERENCES ""Users"" (""Id"") ON DELETE RESTRICT
            );
        ");

        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""SubscriptionHistories"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_SubscriptionHistories"" PRIMARY KEY AUTOINCREMENT,
                ""UserId"" INTEGER NOT NULL,
                ""Action"" TEXT NOT NULL,
                ""OldPlan"" TEXT NULL,
                ""NewPlan"" TEXT NULL,
                ""ChangedByAdminId"" INTEGER NULL,
                ""Reason"" TEXT NULL,
                ""CreatedAt"" TEXT NOT NULL,
                CONSTRAINT ""FK_SubscriptionHistories_Users_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_SubscriptionHistories_Users_ChangedByAdminId"" FOREIGN KEY (""ChangedByAdminId"") REFERENCES ""Users"" (""Id"") ON DELETE SET NULL
            );
        ");

        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""PlatformConfigs"" (
                ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_PlatformConfigs"" PRIMARY KEY AUTOINCREMENT,
                ""Key"" TEXT NOT NULL,
                ""Value"" TEXT NOT NULL,
                ""Description"" TEXT NULL,
                ""UpdatedAt"" TEXT NOT NULL,
                ""UpdatedByAdminId"" INTEGER NULL
            );
        ");

        // ── Add new columns to UserSubscriptions (safe for existing DB) ───────
        try { context.Database.ExecuteSqlRaw(@"ALTER TABLE ""UserSubscriptions"" ADD COLUMN ""TotalReviewerConsultations"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { context.Database.ExecuteSqlRaw(@"ALTER TABLE ""UserSubscriptions"" ADD COLUMN ""RemainingReviewerConsultations"" INTEGER NOT NULL DEFAULT 0;"); } catch { }
        try { context.Database.ExecuteSqlRaw(@"ALTER TABLE ""UserSubscriptions"" ADD COLUMN ""LastConsultationResetDate"" TEXT NULL;"); } catch { }
        try { context.Database.ExecuteSqlRaw(@"ALTER TABLE ""UserSubscriptions"" ADD COLUMN ""GrantedByAdminId"" INTEGER NULL;"); } catch { }
        try { context.Database.ExecuteSqlRaw(@"ALTER TABLE ""UserSubscriptions"" ADD COLUMN ""GrantedMethod"" TEXT NOT NULL DEFAULT 'Payment';"); } catch { }
        try { context.Database.ExecuteSqlRaw(@"ALTER TABLE ""UserSubscriptions"" ADD COLUMN ""AdminRemarks"" TEXT NULL;"); } catch { }
        try { context.Database.ExecuteSqlRaw(@"ALTER TABLE ""UserSubscriptions"" ADD COLUMN ""UpdatedAt"" TEXT NOT NULL DEFAULT '2026-06-26 00:00:00';"); } catch { }

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
