namespace StartupFunding.Domain.Entities;

public class Proposal
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
    public int StartupId { get; set; }
    public Startup Startup { get; set; } = null!;
}
