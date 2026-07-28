namespace StartupFunding.Application.DTOs.Proposal;

public class CreateProposalDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
}
