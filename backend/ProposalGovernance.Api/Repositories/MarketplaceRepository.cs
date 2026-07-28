using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Repositories
{
    public interface IMarketplaceRepository
    {
        Task<IEnumerable<Proposal>> GetAllForMarketplaceAsync();
        Task<InvestorInterest?> GetInterestByProposalAndInvestorAsync(int proposalId, int investorId);
        Task AddInterestAsync(InvestorInterest interest);
        Task RemoveInterestAsync(int proposalId, int investorId);
        Task<int> GetInterestCountByProposalAsync(int proposalId);
        Task<bool> SaveChangesAsync();
    }

    public class MarketplaceRepository : IMarketplaceRepository
    {
        private readonly GovernanceDbContext _context;

        public MarketplaceRepository(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Proposal>> GetAllForMarketplaceAsync()
        {
            return await _context.Proposals
                .Include(p => p.Submitter)
                .Where(p => p.Status != ProposalStatuses.Draft)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<InvestorInterest?> GetInterestByProposalAndInvestorAsync(int proposalId, int investorId)
        {
            return await _context.InvestorInterests
                .FirstOrDefaultAsync(ii => ii.ProposalId == proposalId && ii.InvestorId == investorId);
        }

        public async Task AddInterestAsync(InvestorInterest interest)
        {
            await _context.InvestorInterests.AddAsync(interest);
        }

        public async Task RemoveInterestAsync(int proposalId, int investorId)
        {
            var interest = await GetInterestByProposalAndInvestorAsync(proposalId, investorId);
            if (interest != null)
            {
                _context.InvestorInterests.Remove(interest);
            }
        }

        public async Task<int> GetInterestCountByProposalAsync(int proposalId)
        {
            return await _context.InvestorInterests
                .CountAsync(ii => ii.ProposalId == proposalId);
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
