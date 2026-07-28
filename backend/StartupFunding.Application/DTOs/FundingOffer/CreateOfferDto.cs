namespace StartupFunding.Application.DTOs.FundingOffer;

public class CreateOfferDto
{
    public int ProposalId { get; set; }
    public decimal Amount { get; set; }
    public decimal EquityPercentage { get; set; }
}
