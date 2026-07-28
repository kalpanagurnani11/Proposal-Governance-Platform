using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Repositories
{
    public interface IReviewRepository
    {
        Task<Review?> GetByIdAsync(int id);
        Task<IEnumerable<Review>> GetByProposalIdAsync(int proposalId);
        Task<IEnumerable<Review>> GetByReviewerIdAsync(int reviewerId);
        Task AddAsync(Review review);
        Task<bool> SaveChangesAsync();
    }

    public class ReviewRepository : IReviewRepository
    {
        private readonly GovernanceDbContext _context;

        public ReviewRepository(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<Review?> GetByIdAsync(int id)
        {
            return await _context.Reviews
                .Include(r => r.Proposal)
                .Include(r => r.Reviewer)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<IEnumerable<Review>> GetByProposalIdAsync(int proposalId)
        {
            return await _context.Reviews
                .Include(r => r.Reviewer)
                .Where(r => r.ProposalId == proposalId)
                .ToListAsync();
        }

        public async Task<IEnumerable<Review>> GetByReviewerIdAsync(int reviewerId)
        {
            return await _context.Reviews
                .Include(r => r.Proposal)
                .Where(r => r.ReviewerId == reviewerId)
                .ToListAsync();
        }

        public async Task AddAsync(Review review)
        {
            await _context.Reviews.AddAsync(review);
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
