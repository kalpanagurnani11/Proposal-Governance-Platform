using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Repositories
{
    public interface ICapitalRepository
    {
        Task<CapitalAllocation?> GetAllocationByProposalIdAsync(int proposalId);
        Task<IEnumerable<CapitalAllocation>> GetAllAllocationsAsync();
        Task AddAllocationAsync(CapitalAllocation allocation);
        Task AddTransactionAsync(Transaction transaction);
        Task<IEnumerable<Transaction>> GetTransactionsByAllocationIdAsync(int allocationId);
        Task<bool> SaveChangesAsync();
    }

    public class CapitalRepository : ICapitalRepository
    {
        private readonly GovernanceDbContext _context;

        public CapitalRepository(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<CapitalAllocation?> GetAllocationByProposalIdAsync(int proposalId)
        {
            return await _context.CapitalAllocations
                .Include(ca => ca.Proposal)
                .FirstOrDefaultAsync(ca => ca.ProposalId == proposalId);
        }

        public async Task<IEnumerable<CapitalAllocation>> GetAllAllocationsAsync()
        {
            return await _context.CapitalAllocations
                .Include(ca => ca.Proposal)
                .OrderByDescending(ca => ca.AllocatedAt)
                .ToListAsync();
        }

        public async Task AddAllocationAsync(CapitalAllocation allocation)
        {
            await _context.CapitalAllocations.AddAsync(allocation);
        }

        public async Task AddTransactionAsync(Transaction transaction)
        {
            await _context.Transactions.AddAsync(transaction);
        }

        public async Task<IEnumerable<Transaction>> GetTransactionsByAllocationIdAsync(int allocationId)
        {
            return await _context.Transactions
                .Where(t => t.CapitalAllocationId == allocationId)
                .OrderByDescending(t => t.TransactionDate)
                .ToListAsync();
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
