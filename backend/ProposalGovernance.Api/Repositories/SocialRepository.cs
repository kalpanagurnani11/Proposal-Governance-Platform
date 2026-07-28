using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Repositories
{
    public interface ISocialRepository
    {
        Task<IEnumerable<ProposalLike>> GetLikesByProposalIdAsync(int proposalId);
        Task<bool> HasUserLikedAsync(int proposalId, int userId);
        Task AddLikeAsync(ProposalLike like);
        Task RemoveLikeAsync(int proposalId, int userId);
        Task<IEnumerable<ProposalComment>> GetCommentsByProposalIdAsync(int proposalId);
        Task<ProposalComment?> GetCommentByIdAsync(int id);
        Task AddCommentAsync(ProposalComment comment);
        Task DeleteCommentAsync(int id);
        Task<IEnumerable<Investment>> GetRecentInvestmentsAsync(int limit);
        Task<bool> SaveChangesAsync();
    }

    public class SocialRepository : ISocialRepository
    {
        private readonly GovernanceDbContext _context;

        public SocialRepository(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ProposalLike>> GetLikesByProposalIdAsync(int proposalId)
        {
            return await _context.ProposalLikes
                .Include(l => l.User)
                .Where(l => l.ProposalId == proposalId)
                .ToListAsync();
        }

        public async Task<bool> HasUserLikedAsync(int proposalId, int userId)
        {
            return await _context.ProposalLikes
                .AnyAsync(l => l.ProposalId == proposalId && l.UserId == userId);
        }

        public async Task AddLikeAsync(ProposalLike like)
        {
            await _context.ProposalLikes.AddAsync(like);
        }

        public async Task RemoveLikeAsync(int proposalId, int userId)
        {
            var like = await _context.ProposalLikes
                .FirstOrDefaultAsync(l => l.ProposalId == proposalId && l.UserId == userId);
            if (like != null)
            {
                _context.ProposalLikes.Remove(like);
            }
        }

        public async Task<IEnumerable<ProposalComment>> GetCommentsByProposalIdAsync(int proposalId)
        {
            return await _context.ProposalComments
                .Include(c => c.User)
                .Where(c => c.ProposalId == proposalId)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();
        }

        public async Task<ProposalComment?> GetCommentByIdAsync(int id)
        {
            return await _context.ProposalComments
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task AddCommentAsync(ProposalComment comment)
        {
            await _context.ProposalComments.AddAsync(comment);
        }

        public async Task DeleteCommentAsync(int id)
        {
            var comment = await _context.ProposalComments.FindAsync(id);
            if (comment != null)
            {
                _context.ProposalComments.Remove(comment);
            }
        }

        public async Task<IEnumerable<Investment>> GetRecentInvestmentsAsync(int limit)
        {
            return await _context.Investments
                .Include(i => i.Investor)
                .Include(i => i.Proposal)
                .OrderByDescending(i => i.InvestedAt)
                .Take(limit)
                .ToListAsync();
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
