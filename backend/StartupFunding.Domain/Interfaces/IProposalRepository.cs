using StartupFunding.Domain.Entities;

namespace StartupFunding.Domain.Interfaces;

public interface IProposalRepository
{
    Task<Proposal?> GetByIdAsync(int id);
    Task<IEnumerable<Proposal>> GetAllAsync();
    Task AddAsync(Proposal proposal);
    Task UpdateAsync(Proposal proposal);
}
