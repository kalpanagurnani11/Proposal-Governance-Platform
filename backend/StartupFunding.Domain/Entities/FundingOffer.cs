namespace StartupFunding.Domain.Entities;

public class FundingOffer
{
    public int Id { get; set; }
    public int ProposalId { get; set; }
    public int InvestorId { get; set; }
    public decimal Amount { get; set; }
    public decimal EquityPercentage { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Accepted, Rejected
}
