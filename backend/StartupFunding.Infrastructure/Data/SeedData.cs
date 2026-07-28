using StartupFunding.Infrastructure.Data;

namespace StartupFunding.Infrastructure.Data;

public static class SeedData
{
    public static void Initialize(AppDbContext context)
    {
        context.Database.EnsureCreated();
        // Seed code could go here
    }
}
