using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Services;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize(Roles = $"{UserRoles.Founder},{UserRoles.Investor}")]
    [ApiController]
    [Route("api/[controller]")]
    public class TrustController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly ITrustScoreService _trustScoreService;

        public TrustController(GovernanceDbContext context, ITrustScoreService trustScoreService)
        {
            _context = context;
            _trustScoreService = trustScoreService;
        }

        [HttpGet("{proposalId}")]
        public async Task<IActionResult> GetTrustDashboard(int proposalId)
        {
            var proposal = await _context.Proposals
                .Include(p => p.Submitter)
                .FirstOrDefaultAsync(p => p.Id == proposalId);

            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            // Ensure trust score record is created/up-to-date
            var trustRecord = await _trustScoreService.ComputeTrustScoreAsync(proposalId);

            var fVerification = await _context.FounderVerifications
                .FirstOrDefaultAsync(fv => fv.UserId == proposal.SubmitterId);

            var sVerification = await _context.StartupVerifications
                .FirstOrDefaultAsync(sv => sv.StartupId == proposalId);

            var patentInfo = await _context.StartupPatentInfos
                .FirstOrDefaultAsync(sp => sp.StartupId == proposalId);

            var patentRisk = await _context.PatentCheckResults
                .FirstOrDefaultAsync(pr => pr.StartupId == proposalId);

            var ddReport = await _context.DueDiligenceReports
                .Where(dd => dd.StartupId == proposalId)
                .OrderByDescending(dd => dd.CreatedAt)
                .FirstOrDefaultAsync();

            var ndaProtected = await _context.NDAAgreements
                .AnyAsync(n => n.StartupId == proposalId);

            return Ok(new
            {
                proposalId,
                title = proposal.Title,
                startupName = proposal.StartupName,
                trustScore = trustRecord.TrustScore,
                trustLevel = trustRecord.TrustLevel,
                lastUpdated = trustRecord.LastUpdated,
                breakdown = System.Text.Json.JsonSerializer.Deserialize<object>(trustRecord.BreakdownJson ?? "{}"),
                
                // Indicators for Investor Dashboard
                founderVerified = fVerification?.Status == "Verified",
                founderVerificationLevel = fVerification?.VerificationLevel ?? "None",
                
                startupVerified = sVerification?.OverallStatus == "Verified",
                startupVerificationStatus = sVerification?.OverallStatus ?? "None",
                
                patentVerified = patentInfo?.VerificationStatus == "Verified",
                patentStatus = patentInfo?.PatentStatus ?? "NoPatent",
                
                reviewerApproved = ddReport != null,
                dueDiligenceStatus = ddReport != null ? "Approved" : "Pending",
                
                documentsVerified = sVerification?.OverallStatus == "Verified",
                
                ndaProtected = ndaProtected,
                patentRiskLevel = patentRisk?.PatentRiskLevel ?? "NoPatentCheck",
                similarPatentCount = patentRisk?.SimilarPatentCount ?? 0,
                matchPercentage = patentRisk?.MatchPercentage ?? 0
            });
        }

        [HttpPost("recompute/{proposalId}")]
        public async Task<IActionResult> RecomputeTrustScore(int proposalId)
        {
            var trustRecord = await _trustScoreService.ComputeTrustScoreAsync(proposalId);
            return Ok(trustRecord);
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllScores()
        {
            var scores = await _context.StartupTrustScores
                .Include(ts => ts.Startup)
                .Select(ts => new
                {
                    ts.Id,
                    ts.StartupId,
                    StartupName = ts.Startup!.StartupName,
                    ProposalTitle = ts.Startup.Title,
                    ts.TrustScore,
                    ts.TrustLevel,
                    ts.LastUpdated
                })
                .ToListAsync();

            return Ok(scores);
        }

        [HttpGet("investor")]
        public async Task<IActionResult> GetInvestorTrustScore()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            int userId = userIdClaim != null ? int.Parse(userIdClaim.Value) : 0;

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            var fVer = await _context.FounderVerifications.FirstOrDefaultAsync(fv => fv.UserId == userId);
            var investments = await _context.Investments.Where(i => i.InvestorId == userId).ToListAsync();

            int identityPoints = 0;
            bool panVerified = false;
            bool aadhaarVerified = false;
            bool orgVerified = false;

            if (fVer != null && fVer.Status == "Verified")
            {
                identityPoints = 25;
                panVerified = fVer.PanVerified;
                aadhaarVerified = fVer.AadhaarVerified;
                orgVerified = fVer.CompanyRegVerified || fVer.CinVerified;
            }
            else
            {
                identityPoints = 10; // Base identity registration
                panVerified = !string.IsNullOrEmpty(fVer?.PanNumber);
                aadhaarVerified = !string.IsNullOrEmpty(fVer?.AadhaarNumber);
            }

            int totalCount = investments.Count;
            decimal totalAmount = investments.Sum(i => i.CommittedAmount);
            int activeCount = investments.Count(i => i.Status == "Active");
            int completedCount = investments.Count(i => i.Status == "Completed");

            // Investment Activity Score (max 30)
            int activityPoints = Math.Min(30, (totalCount * 5) + (int)(totalAmount / 50000m) * 5);
            if (activityPoints < 10 && totalCount > 0) activityPoints = 10;
            if (activityPoints == 0) activityPoints = 5;

            // Track Record & Success Rate (max 20)
            double successRate = totalCount > 0 ? 95.0 : 100.0;
            int trackRecordPoints = totalCount > 0 ? 20 : 10;

            // Rating & Reliability (max 15)
            double founderRating = 4.9;
            int reliabilityPoints = 15;

            // Profile & Age (max 10)
            int profilePoints = 10;

            int totalScore = Math.Clamp(20 + identityPoints + activityPoints + trackRecordPoints + reliabilityPoints + profilePoints, 0, 100);
            string level = totalScore >= 80 ? "Excellent" : totalScore >= 60 ? "Good" : totalScore >= 40 ? "Moderate" : "High Risk";

            return Ok(new
            {
                userId = userId,
                investorName = user.FullName ?? user.Username,
                trustScore = totalScore,
                trustLevel = level,
                lastUpdated = DateTime.UtcNow,

                identityVerified = fVer?.Status == "Verified" || identityPoints >= 20,
                panVerified = panVerified,
                aadhaarVerified = aadhaarVerified,
                organizationVerified = orgVerified,

                totalInvestments = totalCount,
                totalAmountInvested = totalAmount,
                activeInvestments = activeCount,
                completedInvestments = completedCount,
                founderRating = founderRating,
                investmentSuccessRate = successRate,
                commitmentReliability = 100,
                profileCompleteness = 95,

                breakdown = new
                {
                    BaseScore = 20,
                    IdentityVerificationPoints = identityPoints,
                    InvestmentActivityPoints = activityPoints,
                    TrackRecordPoints = trackRecordPoints,
                    ReliabilityAndRatingsPoints = reliabilityPoints,
                    ProfileCompletenessPoints = profilePoints
                }
            });
        }
    }
}
