using StartupFunding.Application.DTOs.Proposal;

namespace StartupFunding.Application.Interfaces;

public interface IProposalService
{
    Task<ProposalResponseDto> CreateProposalAsync(CreateProposalDto dto, int founderId);
    Task<IEnumerable<ProposalResponseDto>> GetAllProposalsAsync();
    Task<ProposalResponseDto?> GetProposalByIdAsync(int id);
}
