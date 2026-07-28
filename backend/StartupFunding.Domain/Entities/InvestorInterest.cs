namespace StartupFunding.Domain.Entities;

public class InvestorInterest
{
    public int Id { get; set; }
    public int ProposalId { get; set; }
    public int InvestorId { get; set; }
    public DateTime MarkedAt { get; set; } = DateTime.UtcNow;
}
