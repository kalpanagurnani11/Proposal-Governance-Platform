using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Services
{
    public interface IVisibilityScoreService
    {
        Task<double> ComputeVisibilityScoreAsync(int proposalId);
    }

    public class VisibilityScoreService : IVisibilityScoreService
    {
        private readonly GovernanceDbContext _context;
        private readonly ISubscriptionService _subscriptionService;

        public VisibilityScoreService(GovernanceDbContext context, ISubscriptionService subscriptionService)
        {
            _context = context;
            _subscriptionService = subscriptionService;
        }

        public async Task<double> ComputeVisibilityScoreAsync(int proposalId)
        {
            var proposal = await _context.Proposals
                .FirstOrDefaultAsync(p => p.Id == proposalId);

            if (proposal == null) return 0;

            double baseScore = 100.0;
            double premiumBoost = 0.0;
            double trustBoost = 0.0;
            double engagementScore = 0.0;
            double recencyScore = 0.0;

            // 1. Premium and Featured Boosts
            bool isPremium = await _subscriptionService.HasPremiumAsync(proposal.SubmitterId);
            if (isPremium)
            {
                premiumBoost += 250.0;
            }

            var activeFeatured = await _context.FeaturedListings
                .AnyAsync(f => f.StartupId == proposalId && f.Status == "Active" && f.EndDate > DateTime.UtcNow);
            if (activeFeatured)
            {
                premiumBoost += 500.0; // Huge boost for featured listing
            }

            // 2. Trust Score Boost
            var trustRecord = await _context.StartupTrustScores
                .FirstOrDefaultAsync(t => t.StartupId == proposalId);
            if (trustRecord != null)
            {
                trustBoost += trustRecord.TrustScore * 2.0; // scale 0-200
            }

            // 3. Engagement Score
            int viewsCount = await _context.ProposalViews.CountAsync(pv => pv.ProposalId == proposalId);
            int likesCount = await _context.ProposalLikes.CountAsync(pl => pl.ProposalId == proposalId);
            int commentsCount = await _context.ProposalComments.CountAsync(pc => pc.ProposalId == proposalId);
            int interestCount = await _context.InvestorInterests.CountAsync(ii => ii.ProposalId == proposalId);

            engagementScore = (viewsCount * 2.0) + (likesCount * 5.0) + (commentsCount * 10.0) + (interestCount * 15.0);

            // 4. Recency Score
            var daysSinceCreation = (DateTime.UtcNow - proposal.CreatedAt).TotalDays;
            if (daysSinceCreation < 0) daysSinceCreation = 0;
            recencyScore = 150.0 / (daysSinceCreation + 1.0); // max 150 points fading over time

            return baseScore + premiumBoost + trustBoost + engagementScore + recencyScore;
        }
    }
}
