using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Data
{
    public class GovernanceDbContext : DbContext
    {
        public GovernanceDbContext(DbContextOptions<GovernanceDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Proposal> Proposals { get; set; } = null!;
        public DbSet<Review> Reviews { get; set; } = null!;
        public DbSet<CapitalAllocation> CapitalAllocations { get; set; } = null!;
        public DbSet<Transaction> Transactions { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<Investment> Investments { get; set; } = null!;
        public DbSet<ProposalLike> ProposalLikes { get; set; } = null!;
        public DbSet<ProposalComment> ProposalComments { get; set; } = null!;
        public DbSet<InvestorInterest> InvestorInterests { get; set; } = null!;
        public DbSet<Discussion> Discussions { get; set; } = null!;
        public DbSet<DiscussionMessage> DiscussionMessages { get; set; } = null!;

        // Subscription, security, NDA, verification, trust score and audit log DbSets
        public DbSet<Subscription> Subscriptions { get; set; } = null!;
        public DbSet<UserSubscription> UserSubscriptions { get; set; } = null!;
        public DbSet<Payment> Payments { get; set; } = null!;
        public DbSet<FeaturedListing> FeaturedListings { get; set; } = null!;
        public DbSet<ProposalAccessRequest> ProposalAccessRequests { get; set; } = null!;
        public DbSet<NDAAgreement> NDAAgreements { get; set; } = null!;
        public DbSet<ProposalView> ProposalViews { get; set; } = null!;
        public DbSet<DocumentDownload> DocumentDownloads { get; set; } = null!;
        public DbSet<StartupPatentInfo> StartupPatentInfos { get; set; } = null!;
        public DbSet<PatentCheckResult> PatentCheckResults { get; set; } = null!;
        public DbSet<StartupTrustScore> StartupTrustScores { get; set; } = null!;
        public DbSet<FounderVerification> FounderVerifications { get; set; } = null!;
        public DbSet<StartupVerification> StartupVerifications { get; set; } = null!;
        public DbSet<AuditLog> AuditLogs { get; set; } = null!;
        public DbSet<DueDiligenceReport> DueDiligenceReports { get; set; } = null!;

        // ── Subscription Extension (ADDED) ───────────────────────────────────
        public DbSet<AIAssistantLog> AIAssistantLogs { get; set; } = null!;
        public DbSet<ConsultationRequest> ConsultationRequests { get; set; } = null!;
        public DbSet<ConsultationMessage> ConsultationMessages { get; set; } = null!;
        public DbSet<SubscriptionHistory> SubscriptionHistories { get; set; } = null!;
        public DbSet<PlatformConfig> PlatformConfigs { get; set; } = null!;

        // ── Milestone & Dividend System DbSets ───────────────────────────────
        public DbSet<Milestone> Milestones { get; set; } = null!;
        public DbSet<ProgressUpdate> ProgressUpdates { get; set; } = null!;
        public DbSet<DividendPayout> DividendPayouts { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure cascade deletes or constraints
            modelBuilder.Entity<Proposal>()
                .HasOne(p => p.Submitter)
                .WithMany()
                .HasForeignKey(p => p.SubmitterId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.Proposal)
                .WithMany()
                .HasForeignKey(r => r.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.Reviewer)
                .WithMany()
                .HasForeignKey(r => r.ReviewerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<CapitalAllocation>()
                .HasOne(ca => ca.Proposal)
                .WithMany()
                .HasForeignKey(ca => ca.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Transaction>()
                .HasOne(t => t.CapitalAllocation)
                .WithMany()
                .HasForeignKey(t => t.CapitalAllocationId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Investment>()
                .HasOne(i => i.Investor)
                .WithMany()
                .HasForeignKey(i => i.InvestorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Investment>()
                .HasOne(i => i.Proposal)
                .WithMany()
                .HasForeignKey(i => i.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure ProposalLike compound key and relations
            modelBuilder.Entity<ProposalLike>()
                .HasKey(pl => new { pl.ProposalId, pl.UserId });

            modelBuilder.Entity<ProposalLike>()
                .HasOne(pl => pl.Proposal)
                .WithMany()
                .HasForeignKey(pl => pl.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProposalLike>()
                .HasOne(pl => pl.User)
                .WithMany()
                .HasForeignKey(pl => pl.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure ProposalComment relations
            modelBuilder.Entity<ProposalComment>()
                .HasOne(pc => pc.Proposal)
                .WithMany()
                .HasForeignKey(pc => pc.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ProposalComment>()
                .HasOne(pc => pc.User)
                .WithMany()
                .HasForeignKey(pc => pc.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure InvestorInterest relations
            modelBuilder.Entity<InvestorInterest>()
                .HasOne(ii => ii.Investor)
                .WithMany()
                .HasForeignKey(ii => ii.InvestorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<InvestorInterest>()
                .HasOne(ii => ii.Proposal)
                .WithMany()
                .HasForeignKey(ii => ii.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Discussion relations
            modelBuilder.Entity<Discussion>()
                .HasOne(d => d.Proposal)
                .WithMany()
                .HasForeignKey(d => d.ProposalId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Discussion>()
                .HasOne(d => d.Investor)
                .WithMany()
                .HasForeignKey(d => d.InvestorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Discussion>()
                .HasOne(d => d.Submitter)
                .WithMany()
                .HasForeignKey(d => d.SubmitterId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure DiscussionMessage relations
            modelBuilder.Entity<DiscussionMessage>()
                .HasOne(dm => dm.Discussion)
                .WithMany()
                .HasForeignKey(dm => dm.DiscussionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<DiscussionMessage>()
                .HasOne(dm => dm.Sender)
                .WithMany()
                .HasForeignKey(dm => dm.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            // ── Consultation System ───────────────────────────────────────────────
            modelBuilder.Entity<ConsultationRequest>()
                .HasOne(c => c.User).WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ConsultationRequest>()
                .HasOne(c => c.Reviewer).WithMany().HasForeignKey(c => c.ReviewerId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<ConsultationRequest>()
                .HasOne(c => c.Startup).WithMany().HasForeignKey(c => c.StartupId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<ConsultationMessage>()
                .HasOne(m => m.Consultation).WithMany().HasForeignKey(m => m.ConsultationId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ConsultationMessage>()
                .HasOne(m => m.Sender).WithMany().HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Restrict);

            // ── Subscription History ──────────────────────────────────────────────
            modelBuilder.Entity<SubscriptionHistory>()
                .HasOne(sh => sh.User).WithMany().HasForeignKey(sh => sh.UserId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<SubscriptionHistory>()
                .HasOne(sh => sh.ChangedByAdmin).WithMany().HasForeignKey(sh => sh.ChangedByAdminId).OnDelete(DeleteBehavior.SetNull);

            // ── UserSubscription admin grant ──────────────────────────────────────
            modelBuilder.Entity<UserSubscription>()
                .HasOne(us => us.GrantedByAdmin).WithMany().HasForeignKey(us => us.GrantedByAdminId).OnDelete(DeleteBehavior.SetNull);

            // ── AI Assistant Logs ─────────────────────────────────────────────────
            modelBuilder.Entity<AIAssistantLog>()
                .HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);

            // ── Milestones & Progress & Dividends ─────────────────────────────────
            modelBuilder.Entity<Milestone>()
                .HasOne(m => m.Proposal).WithMany().HasForeignKey(m => m.ProposalId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ProgressUpdate>()
                .HasOne(pu => pu.Proposal).WithMany().HasForeignKey(pu => pu.ProposalId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ProgressUpdate>()
                .HasOne(pu => pu.Author).WithMany().HasForeignKey(pu => pu.AuthorId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<DividendPayout>()
                .HasOne(dp => dp.Proposal).WithMany().HasForeignKey(dp => dp.ProposalId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<DividendPayout>()
                .HasOne(dp => dp.Investor).WithMany().HasForeignKey(dp => dp.InvestorId).OnDelete(DeleteBehavior.Restrict);


            // Seed Subscriptions
            modelBuilder.Entity<Subscription>().HasData(
                new Subscription { Id = 1, Name = "Founder Free", UserRole = UserRoles.Founder, Price = 0.00m, DurationInDays = 9999, Description = "Standard listing and interest requests." },
                new Subscription { Id = 2, Name = "Founder Premium", UserRole = UserRoles.Founder, Price = 4999.00m, DurationInDays = 30, Description = "Priority listing, visibility boost, verified badge, and priority consultation." },
                new Subscription { Id = 3, Name = "Investor Free", UserRole = UserRoles.Investor, Price = 0.00m, DurationInDays = 9999, Description = "Standard browse, view public proposals, and request access." },
                new Subscription { Id = 4, Name = "Investor Premium", UserRole = UserRoles.Investor, Price = 9999.00m, DurationInDays = 30, Description = "Advanced filters, comparisons, risk reports, and trust breakdown." }
            );

            // Seed initial data
            string adminHash = BCrypt.Net.BCrypt.HashPassword("admin123");
            string revHash1 = BCrypt.Net.BCrypt.HashPassword("reviewer123");
            string revHash2 = BCrypt.Net.BCrypt.HashPassword("reviewer123");
            string subHash1 = BCrypt.Net.BCrypt.HashPassword("submitter123");
            string subHash2 = BCrypt.Net.BCrypt.HashPassword("submitter123");

            modelBuilder.Entity<User>().HasData(
                new User { Id = 1, Username = "admin", PasswordHash = adminHash, Role = UserRoles.Admin, FullName = "System Administrator", Email = "admin@governance.com", Department = "Finance" },
                new User { Id = 2, Username = "reviewer1", PasswordHash = revHash1, Role = UserRoles.Reviewer, FullName = "Sarah Jenkins", Email = "sjenkins@governance.com", Department = "Engineering" },
                new User { Id = 3, Username = "reviewer2", PasswordHash = revHash2, Role = UserRoles.Reviewer, FullName = "David Vance", Email = "dvance@governance.com", Department = "Operations" },
                new User 
                { 
                    Id = 4, 
                    Username = "submitter1", 
                    PasswordHash = subHash1, 
                    Role = UserRoles.Founder, 
                    FullName = "Alice Cooper", 
                    Email = "acooper@governance.com", 
                    Department = "R&D",
                    PatentId = "US10123456",
                    PatentVerificationStatus = "Verified",
                    PatentDetailsJson = "{\"Title\":\"Decentralized Ledger Protocol for Secure Capital Allocation\",\"Abstract\":\"A distributed ledger mechanism for managing governance workflows, processing transactions with cryptographically verifiable proofs, and enforcing strict budget threshold validation across organizational structures.\",\"Inventors\":\"Alice Cooper, Sarah Jenkins\",\"IssueDate\":\"2024-05-18\",\"Status\":\"Active\"}"
                },
                new User { Id = 5, Username = "submitter2", PasswordHash = subHash2, Role = UserRoles.Founder, FullName = "Bob Martin", Email = "bmartin@governance.com", Department = "Marketing" },
                new User { Id = 6, Username = "investor1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("investor123"), Role = UserRoles.Investor, FullName = "Priya Kapoor", Email = "pkapoor@venturefund.com", Department = "Finance" }
            );

            modelBuilder.Entity<Proposal>().HasData(
                new Proposal
                {
                    Id = 1,
                    Title = "NextGen AI Platform Infrastructure",
                    Description = "Acquisition of specialized GPU cluster assets to support machine learning workloads across corporate products.",
                    Department = "R&D",
                    RequestedAmount = 1200000.00m,
                    Status = ProposalStatuses.Submitted,
                    SubmitterId = 4,
                    StartupName = "NextGen AI Labs",
                    ProblemStatement = "Lack of high-performance GPU resources limits rapid model training, causing delays in product releases.",
                    ProposedStatement = "Establish a dedicated, localized GPU infrastructure cluster to accelerate machine learning workloads.",
                    EquityOffered = 10.00m,
                    BusinessModel = "B2B SaaS subscription model with tiered API pricing for corporate clients.",
                    Industry = "Other",
                    Category = "DeepTech",
                    TeamDetails = "Dr. Alice Cooper (AI Lead, PhD in CompSci), Sarah Jenkins (Infrastructure Engineer)",
                    DemoVideoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    CreatedAt = DateTime.UtcNow.AddDays(-10),
                    UpdatedAt = DateTime.UtcNow.AddDays(-10)
                },
                new Proposal
                {
                    Id = 2,
                    Title = "Global Marketing Campaign 2026",
                    Description = "Comprehensive rebranding and localized marketing campaign targeting APAC and EMEA regions.",
                    Department = "Marketing",
                    RequestedAmount = 450000.00m,
                    Status = ProposalStatuses.Draft,
                    SubmitterId = 5,
                    StartupName = "GlobalReach Marketing",
                    ProblemStatement = "Low brand awareness and localized marketing inefficiency in APAC and EMEA regions.",
                    ProposedStatement = "Launch a comprehensive, localized rebranding and digital marketing campaign across these target markets.",
                    EquityOffered = 5.00m,
                    BusinessModel = "Direct-to-consumer agency model and corporate consulting retainers.",
                    Industry = "Other",
                    Category = "B2B",
                    TeamDetails = "Bob Martin (Marketing Director, 10+ yrs experience)",
                    DemoVideoUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    CreatedAt = DateTime.UtcNow.AddDays(-5),
                    UpdatedAt = DateTime.UtcNow.AddDays(-5)
                }
            );
        }
    }
}
