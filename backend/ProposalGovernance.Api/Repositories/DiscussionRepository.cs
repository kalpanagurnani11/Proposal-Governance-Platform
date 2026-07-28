using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Repositories
{
    public interface IDiscussionRepository
    {
        Task<Discussion> GetOrCreateDiscussionAsync(int proposalId, int investorId, int submitterId);
        Task<Discussion?> GetDiscussionByIdAsync(int id);
        Task<IEnumerable<Discussion>> GetDiscussionsByUserIdAsync(int userId);
        Task<IEnumerable<DiscussionMessage>> GetMessagesByDiscussionIdAsync(int discussionId);
        Task AddMessageAsync(DiscussionMessage message);
        Task<bool> SaveChangesAsync();
    }

    public class DiscussionRepository : IDiscussionRepository
    {
        private readonly GovernanceDbContext _context;

        public DiscussionRepository(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<Discussion> GetOrCreateDiscussionAsync(int proposalId, int investorId, int submitterId)
        {
            var discussion = await _context.Discussions
                .FirstOrDefaultAsync(d => d.ProposalId == proposalId && d.InvestorId == investorId);

            if (discussion == null)
            {
                discussion = new Discussion
                {
                    ProposalId = proposalId,
                    InvestorId = investorId,
                    SubmitterId = submitterId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    LastMessageAt = DateTime.UtcNow
                };
                await _context.Discussions.AddAsync(discussion);
                await _context.SaveChangesAsync();
            }

            return discussion;
        }

        public async Task<Discussion?> GetDiscussionByIdAsync(int id)
        {
            return await _context.Discussions
                .Include(d => d.Proposal)
                .Include(d => d.Investor)
                .Include(d => d.Submitter)
                .FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task<IEnumerable<Discussion>> GetDiscussionsByUserIdAsync(int userId)
        {
            return await _context.Discussions
                .Include(d => d.Proposal)
                .Include(d => d.Investor)
                .Include(d => d.Submitter)
                .Where(d => d.InvestorId == userId || d.SubmitterId == userId)
                .OrderByDescending(d => d.LastMessageAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<DiscussionMessage>> GetMessagesByDiscussionIdAsync(int discussionId)
        {
            return await _context.DiscussionMessages
                .Include(m => m.Sender)
                .Where(m => m.DiscussionId == discussionId)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();
        }

        public async Task AddMessageAsync(DiscussionMessage message)
        {
            await _context.DiscussionMessages.AddAsync(message);
            
            var discussion = await _context.Discussions.FindAsync(message.DiscussionId);
            if (discussion != null)
            {
                discussion.LastMessageAt = DateTime.UtcNow;
                discussion.UpdatedAt = DateTime.UtcNow;
            }
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }
    }
}
