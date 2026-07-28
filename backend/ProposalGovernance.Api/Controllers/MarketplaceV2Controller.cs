using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Services;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MarketplaceV2Controller : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly IVisibilityScoreService _visibilityScoreService;
        private readonly ISubscriptionService _subscriptionService;

        public MarketplaceV2Controller(
            GovernanceDbContext context,
            IVisibilityScoreService visibilityScoreService,
            ISubscriptionService subscriptionService)
        {
            _context = context;
            _visibilityScoreService = visibilityScoreService;
            _subscriptionService = subscriptionService;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null ? int.Parse(claim.Value) : 0;
        }

        // --- VISIBILITY BOOST RANKED FEED ---

        [HttpGet("feed")]
        public async Task<IActionResult> GetRankedFeed()
        {
            // Only list proposals that are Submitted, UnderReview, Reviewed, Approved, or FundAllocated.
            var proposals = await _context.Proposals
                .Include(p => p.Submitter)
                .Where(p => p.Status != ProposalStatuses.Draft && p.Status != ProposalStatuses.Rejected)
                .ToListAsync();

            var rankedProposals = new List<object>();

            foreach (var p in proposals)
            {
                double finalScore = await _visibilityScoreService.ComputeVisibilityScoreAsync(p.Id);
                
                var trustRecord = await _context.StartupTrustScores
                    .FirstOrDefaultAsync(t => t.StartupId == p.Id);

                var isFeatured = await _context.FeaturedListings
                    .AnyAsync(f => f.StartupId == p.Id && f.Status == "Active" && f.EndDate > DateTime.UtcNow);

                var isPremium = await _subscriptionService.HasPremiumAsync(p.SubmitterId);

                rankedProposals.Add(new
                {
                    p.Id,
                    p.Title,
                    p.Description,
                    p.Department,
                    p.RequestedAmount,
                    p.ApprovedAmount,
                    p.Status,
                    p.StartupName,
                    p.ProblemStatement,
                    p.ProposedStatement,
                    p.EquityOffered,
                    p.Industry,
                    p.Category,
                    p.CreatedAt,
                    SubmitterName = p.Submitter?.FullName ?? "Founder",
                    trustScore = trustRecord?.TrustScore ?? 0,
                    trustLevel = trustRecord?.TrustLevel ?? "Moderate",
                    isFeatured,
                    isPremium,
                    visibilityScore = finalScore
                });
            }

            // Order by visibilityScore descending
            var sorted = rankedProposals
                .Cast<dynamic>()
                .OrderByDescending(x => x.visibilityScore)
                .ToList();

            return Ok(sorted);
        }

        [HttpGet("trending")]
        public async Task<IActionResult> GetTrendingStartups()
        {
            // Trending starts with highest visibility score, limit to 4
            var result = await GetRankedFeed();
            if (result is OkObjectResult okResult && okResult.Value is IEnumerable<object> list)
            {
                return Ok(list.Take(5));
            }
            return Ok(new List<object>());
        }

        // --- PREMIUM SEARCH AND COMPARE ---

        [HttpGet("search")]
        public async Task<IActionResult> SearchStartups(
            [FromQuery] string? q, 
            [FromQuery] string? category, 
            [FromQuery] string? industry,
            [FromQuery] decimal? minFunding,
            [FromQuery] decimal? maxFunding,
            [FromQuery] int? minTrustScore)
        {
            var userId = GetCurrentUserId();
            bool isPremium = await _subscriptionService.HasPremiumAsync(userId);

            // Level check: Non-premium users can't use advanced filters
            bool hasAdvancedFilters = !string.IsNullOrWhiteSpace(category) || 
                                      !string.IsNullOrWhiteSpace(industry) || 
                                      minFunding.HasValue || 
                                      maxFunding.HasValue || 
                                      minTrustScore.HasValue;

            if (hasAdvancedFilters && !isPremium)
            {
                return BadRequest(new { 
                    premiumRequired = true, 
                    message = "Advanced search filters (Category, Industry, Funding range, Trust score) are restricted to Premium Investors." 
                });
            }

            var query = _context.Proposals
                .Include(p => p.Submitter)
                .Where(p => p.Status != ProposalStatuses.Draft && p.Status != ProposalStatuses.Rejected);

            if (!string.IsNullOrWhiteSpace(q))
            {
                q = q.ToLower();
                query = query.Where(p => p.Title.ToLower().Contains(q) || 
                                         p.StartupName.ToLower().Contains(q) || 
                                         p.Description.ToLower().Contains(q) ||
                                         p.ProblemStatement.ToLower().Contains(q));
            }

            if (isPremium)
            {
                // Apply advanced filters
                if (!string.IsNullOrWhiteSpace(category))
                {
                    query = query.Where(p => p.Category == category);
                }
                if (!string.IsNullOrWhiteSpace(industry))
                {
                    query = query.Where(p => p.Industry == industry);
                }
                if (minFunding.HasValue)
                {
                    query = query.Where(p => p.RequestedAmount >= minFunding.Value);
                }
                if (maxFunding.HasValue)
                {
                    query = query.Where(p => p.RequestedAmount <= maxFunding.Value);
                }
            }

            var matching = await query.ToListAsync();
            var results = new List<object>();

            foreach (var p in matching)
            {
                var trustRecord = await _context.StartupTrustScores
                    .FirstOrDefaultAsync(t => t.StartupId == p.Id);

                // Filter by trust score if set
                if (isPremium && minTrustScore.HasValue && (trustRecord == null || trustRecord.TrustScore < minTrustScore.Value))
                {
                    continue;
                }

                double finalScore = await _visibilityScoreService.ComputeVisibilityScoreAsync(p.Id);
                var isFeatured = await _context.FeaturedListings
                    .AnyAsync(f => f.StartupId == p.Id && f.Status == "Active" && f.EndDate > DateTime.UtcNow);

                results.Add(new
                {
                    p.Id,
                    p.Title,
                    p.Description,
                    p.Department,
                    p.RequestedAmount,
                    p.ApprovedAmount,
                    p.Status,
                    p.StartupName,
                    p.EquityOffered,
                    p.Industry,
                    p.Category,
                    p.CreatedAt,
                    SubmitterName = p.Submitter?.FullName ?? "Founder",
                    trustScore = trustRecord?.TrustScore ?? 0,
                    trustLevel = trustRecord?.TrustLevel ?? "Moderate",
                    isFeatured,
                    visibilityScore = finalScore
                });
            }

            var sorted = results
                .Cast<dynamic>()
                .OrderByDescending(x => x.visibilityScore)
                .ToList();

            return Ok(sorted);
        }

        [HttpGet("compare")]
        public async Task<IActionResult> CompareStartups([FromQuery] string ids)
        {
            var userId = GetCurrentUserId();
            bool isPremium = await _subscriptionService.HasPremiumAsync(userId);

            if (!isPremium)
            {
                return BadRequest(new { 
                    premiumRequired = true, 
                    message = "Startup comparison tools are restricted to Premium Investors." 
                });
            }

            if (string.IsNullOrWhiteSpace(ids)) return BadRequest(new { message = "No startup IDs specified." });

            var idList = ids.Split(',')
                .Select(s => int.TryParse(s, out var id) ? id : 0)
                .Where(id => id > 0)
                .ToList();

            if (idList.Count < 2) return BadRequest(new { message = "Please select at least two startups to compare." });

            var proposals = await _context.Proposals
                .Include(p => p.Submitter)
                .Where(p => idList.Contains(p.Id))
                .ToListAsync();

            var comparison = new List<object>();

            foreach (var p in proposals)
            {
                var trustRecord = await _context.StartupTrustScores
                    .FirstOrDefaultAsync(t => t.StartupId == p.Id);

                var patentInfo = await _context.StartupPatentInfos
                    .FirstOrDefaultAsync(sp => sp.StartupId == p.Id);

                var patentRisk = await _context.PatentCheckResults
                    .FirstOrDefaultAsync(pr => pr.StartupId == p.Id);

                var ddReport = await _context.DueDiligenceReports
                    .Where(dd => dd.StartupId == p.Id)
                    .OrderByDescending(dd => dd.CreatedAt)
                    .FirstOrDefaultAsync();

                var likes = await _context.ProposalLikes.CountAsync(l => l.ProposalId == p.Id);
                var comments = await _context.ProposalComments.CountAsync(c => c.ProposalId == p.Id);

                comparison.Add(new
                {
                    p.Id,
                    p.Title,
                    p.StartupName,
                    p.Industry,
                    p.Category,
                    p.RequestedAmount,
                    p.EquityOffered,
                    p.ProblemStatement,
                    p.TeamDetails,
                    Status = p.Status,
                    
                    // Trust indicators
                    trustScore = trustRecord?.TrustScore ?? 0,
                    trustLevel = trustRecord?.TrustLevel ?? "Moderate",
                    
                    // Patent indicators
                    patentStatus = patentInfo?.PatentStatus ?? "NoPatent",
                    patentVerification = patentInfo?.VerificationStatus ?? "Unverified",
                    patentRiskLevel = patentRisk?.PatentRiskLevel ?? "NoPatentCheck",
                    
                    // DD indicators
                    innovationScore = ddReport?.InnovationScore ?? 0,
                    marketScore = ddReport?.MarketPotentialScore ?? 0,
                    feasibilityScore = ddReport?.FeasibilityScore ?? 0,
                    teamScore = ddReport?.TeamStrengthScore ?? 0,
                    riskScore = ddReport?.RiskAssessmentScore ?? 0,
                    
                    // Engagement
                    likes,
                    comments
                });
            }

            return Ok(comparison);
        }
    }
}
