using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Repositories
{
    public interface IInvestmentRepository
    {
        Task<IEnumerable<Investment>> GetByInvestorIdAsync(int investorId);
        Task<IEnumerable<Investment>> GetByProposalIdAsync(int proposalId);
        Task<Investment?> GetByIdAsync(int id);
        Task AddAsync(Investment investment);
        Task<bool> SaveChangesAsync();
    }

    public class InvestmentRepository : IInvestmentRepository
    {
        private readonly GovernanceDbContext _context;

        public InvestmentRepository(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Investment>> GetByInvestorIdAsync(int investorId)
        {
            return await _context.Investments
                .Include(i => i.Proposal)
                    .ThenInclude(p => p!.Submitter)
                .Where(i => i.InvestorId == investorId)
                .OrderByDescending(i => i.InvestedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Investment>> GetByProposalIdAsync(int proposalId)
        {
            return await _context.Investments
                .Include(i => i.Investor)
                .Where(i => i.ProposalId == proposalId)
                .OrderByDescending(i => i.InvestedAt)
                .ToListAsync();
        }

        public async Task<Investment?> GetByIdAsync(int id)
        {
            return await _context.Investments
                .Include(i => i.Proposal)
                .Include(i => i.Investor)
                .FirstOrDefaultAsync(i => i.Id == id);
        }

        public async Task AddAsync(Investment investment)
        {
            await _context.Investments.AddAsync(investment);
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
