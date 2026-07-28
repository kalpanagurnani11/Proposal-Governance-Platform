namespace StartupFunding.Application.DTOs.Proposal;

public class ProposalResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public string Status { get; set; } = string.Empty;
}
