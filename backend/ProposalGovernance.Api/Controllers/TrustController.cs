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
    [Authorize]
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

        [Authorize(Roles = UserRoles.Admin)]
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
    }
}
