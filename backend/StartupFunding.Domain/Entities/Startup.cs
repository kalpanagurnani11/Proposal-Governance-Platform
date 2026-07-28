namespace StartupFunding.Domain.Entities;

public class Startup
{
    public int Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int FounderId { get; set; }
    public User Founder { get; set; } = null!;
}
