using Microsoft.EntityFrameworkCore;
using StartupFunding.Domain.Entities;

namespace StartupFunding.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Startup> Startups => Set<Startup>();
    public DbSet<Proposal> Proposals => Set<Proposal>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<FundingOffer> FundingOffers => Set<FundingOffer>();
    public DbSet<InvestorInterest> InvestorInterests => Set<InvestorInterest>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
}
