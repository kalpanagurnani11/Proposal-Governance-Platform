using StartupFunding.Application.DTOs.Proposal;
using StartupFunding.Application.Interfaces;
using StartupFunding.Domain.Entities;
using StartupFunding.Domain.Interfaces;

namespace StartupFunding.Application.Services;

public class ProposalService : IProposalService
{
    private readonly IProposalRepository _proposalRepository;

    public ProposalService(IProposalRepository proposalRepository)
    {
        _proposalRepository = proposalRepository;
    }

    public async Task<ProposalResponseDto> CreateProposalAsync(CreateProposalDto dto, int founderId)
    {
        var proposal = new Proposal
        {
            Title = dto.Title,
            Description = dto.Description,
            TargetAmount = dto.TargetAmount,
            StartupId = founderId // Simple mapping
        };
        await _proposalRepository.AddAsync(proposal);
        return new ProposalResponseDto
        {
            Id = proposal.Id,
            Title = proposal.Title,
            Description = proposal.Description,
            TargetAmount = proposal.TargetAmount,
            Status = proposal.Status
        };
    }

    public async Task<IEnumerable<ProposalResponseDto>> GetAllProposalsAsync()
    {
        var proposals = await _proposalRepository.GetAllAsync();
        var result = new List<ProposalResponseDto>();
        foreach (var p in proposals)
        {
            result.Add(new ProposalResponseDto
            {
                Id = p.Id,
                Title = p.Title,
                Description = p.Description,
                TargetAmount = p.TargetAmount,
                Status = p.Status
            });
        }
        return result;
    }

    public async Task<ProposalResponseDto?> GetProposalByIdAsync(int id)
    {
        var p = await _proposalRepository.GetByIdAsync(id);
        if (p == null) return null;
        return new ProposalResponseDto
        {
            Id = p.Id,
            Title = p.Title,
            Description = p.Description,
            TargetAmount = p.TargetAmount,
            Status = p.Status
        };
    }
}
