using Microsoft.EntityFrameworkCore;
using StartupFunding.Domain.Entities;
using StartupFunding.Domain.Interfaces;
using StartupFunding.Infrastructure.Data;

namespace StartupFunding.Infrastructure.Repositories;

public class ProposalRepository : IProposalRepository
{
    private readonly AppDbContext _context;

    public ProposalRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Proposal?> GetByIdAsync(int id)
    {
        return await _context.Proposals.FindAsync(id);
    }

    public async Task<IEnumerable<Proposal>> GetAllAsync()
    {
        return await _context.Proposals.ToListAsync();
    }

    public async Task AddAsync(Proposal proposal)
    {
        await _context.Proposals.AddAsync(proposal);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Proposal proposal)
    {
        _context.Proposals.Update(proposal);
        await _context.SaveChangesAsync();
    }
}
