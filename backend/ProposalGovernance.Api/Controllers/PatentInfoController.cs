using System;
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
    public class PatentInfoController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly IPatentVerificationService _patentVerificationService;
        private readonly ITrustScoreService _trustScoreService;
        private readonly IAuditLogService _auditLogService;

        public PatentInfoController(
            GovernanceDbContext context,
            IPatentVerificationService patentVerificationService,
            ITrustScoreService trustScoreService,
            IAuditLogService auditLogService)
        {
            _context = context;
            _patentVerificationService = patentVerificationService;
            _trustScoreService = trustScoreService;
            _auditLogService = auditLogService;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null ? int.Parse(claim.Value) : 0;
        }

        private string GetCurrentUsername()
        {
            return User.Identity?.Name ?? "Unknown";
        }

        [Authorize(Roles = UserRoles.Founder)]
        [HttpPost("startup/submit")]
        public async Task<IActionResult> SubmitPatentInfo([FromBody] SubmitPatentInfoRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var proposal = await _context.Proposals
                .FirstOrDefaultAsync(p => p.Id == request.StartupId && p.SubmitterId == userId);

            if (proposal == null)
            {
                return NotFound(new { message = "Proposal not found or you do not own it." });
            }

            var info = await _context.StartupPatentInfos
                .FirstOrDefaultAsync(sp => sp.StartupId == request.StartupId);

            if (info == null)
            {
                info = new StartupPatentInfo { StartupId = request.StartupId };
                await _context.StartupPatentInfos.AddAsync(info);
            }

            info.PatentStatus = request.PatentStatus; // "NoPatent", "PatentDrafted", "PatentFiled", "PatentPending", "PatentGranted"
            info.PatentNumber = request.PatentNumber;
            info.FilingDate = request.FilingDate;
            info.PatentDocumentUrl = request.PatentDocumentUrl;
            info.LastCheckedAt = DateTime.UtcNow;
            info.VerificationStatus = "Pending";
            info.VerifiedById = null;

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(userId, username, "SubmitPatentInfo", "StartupPatentInfo", info.Id, $"Submitted patent info with status: {request.PatentStatus}", HttpContext.Connection.RemoteIpAddress?.ToString());

            // Check if we can run verification/risk check automatically
            if (!string.IsNullOrWhiteSpace(request.PatentNumber) && request.PatentStatus == "PatentGranted")
            {
                // Run verify and risk check
                await RunCheckInternal(request.StartupId, request.PatentNumber);
            }

            // Recompute trust score
            await _trustScoreService.ComputeTrustScoreAsync(request.StartupId);

            return Ok(new { success = true, data = info, message = "Patent details submitted." });
        }

        [HttpGet("startup/{proposalId}")]
        public async Task<IActionResult> GetPatentInfo(int proposalId)
        {
            var info = await _context.StartupPatentInfos
                .FirstOrDefaultAsync(sp => sp.StartupId == proposalId);

            if (info == null)
            {
                return Ok(new { hasRecord = false, data = new { PatentStatus = "NoPatent" } });
            }

            return Ok(new { hasRecord = true, data = info });
        }

        [HttpPost("check/{proposalId}")]
        public async Task<IActionResult> RunPatentCheck(int proposalId)
        {
            var info = await _context.StartupPatentInfos
                .FirstOrDefaultAsync(sp => sp.StartupId == proposalId);

            if (info == null || string.IsNullOrWhiteSpace(info.PatentNumber))
            {
                return BadRequest(new { message = "No valid patent number submitted for this startup." });
            }

            var result = await RunCheckInternal(proposalId, info.PatentNumber);
            return Ok(result);
        }

        [HttpGet("results/{proposalId}")]
        public async Task<IActionResult> GetCheckResults(int proposalId)
        {
            var results = await _context.PatentCheckResults
                .FirstOrDefaultAsync(pr => pr.StartupId == proposalId);

            if (results == null)
            {
                return NotFound(new { message = "No patent check results found. Run check first." });
            }

            return Ok(results);
        }

        [Authorize(Roles = $"{UserRoles.Reviewer},{UserRoles.Admin}")]
        [HttpPost("verify/{proposalId}")]
        public async Task<IActionResult> VerifyPatentStatus(int proposalId, [FromBody] PatentVerifyReviewRequest request)
        {
            var reviewerId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var info = await _context.StartupPatentInfos
                .FirstOrDefaultAsync(sp => sp.StartupId == proposalId);

            if (info == null) return NotFound(new { message = "Patent info record not found." });

            info.VerificationStatus = request.Status; // "Verified", "Rejected"
            info.VerifiedById = reviewerId;
            info.LastCheckedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync(reviewerId, username, "VerifyPatentStatus", "StartupPatentInfo", info.Id, $"Reviewed patent status: {request.Status}", HttpContext.Connection.RemoteIpAddress?.ToString());

            // Recompute trust
            await _trustScoreService.ComputeTrustScoreAsync(proposalId);

            return Ok(new { success = true, message = "Patent review status updated.", data = info });
        }

        private async Task<PatentCheckResult> RunCheckInternal(int proposalId, string patentNumber)
        {
            var userId = GetCurrentUserId();
            var username = GetCurrentUsername();

            // Reuse the existing IPatentVerificationService
            var verifyResult = await _patentVerificationService.VerifyPatentAsync(patentNumber);

            // Determine patent risk level and similar patents count
            string riskLevel = "Low";
            int similarCount = 0;
            decimal matchPercentage = 0;

            if (verifyResult.IsValid)
            {
                // Simple logic: if abstract contains keywords like "ledger" or "ai", simulate risk
                string description = verifyResult.Abstract ?? "";
                if (description.Contains("cryptographic", StringComparison.OrdinalIgnoreCase) || description.Contains("ledger", StringComparison.OrdinalIgnoreCase))
                {
                    riskLevel = "Medium";
                    similarCount = 3;
                    matchPercentage = 45.0m;
                }
                else
                {
                    riskLevel = "Low";
                    similarCount = 0;
                    matchPercentage = 12.5m;
                }
            }
            else
            {
                // Invalid or verification failed
                riskLevel = "High";
                similarCount = 8;
                matchPercentage = 78.5m;
            }

            var result = await _context.PatentCheckResults
                .FirstOrDefaultAsync(pr => pr.StartupId == proposalId);

            if (result == null)
            {
                result = new PatentCheckResult { StartupId = proposalId };
                await _context.PatentCheckResults.AddAsync(result);
            }

            result.PatentRiskLevel = riskLevel;
            result.SimilarPatentCount = similarCount;
            result.MatchPercentage = matchPercentage;
            result.LastCheckedAt = DateTime.UtcNow;
            result.DetailsJson = System.Text.Json.JsonSerializer.Serialize(verifyResult);

            // Update verification status in info
            var info = await _context.StartupPatentInfos
                .FirstOrDefaultAsync(sp => sp.StartupId == proposalId);
            if (info != null)
            {
                info.VerificationStatus = verifyResult.IsValid ? "Verified" : "Rejected";
                info.LastCheckedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync(userId == 0 ? null : userId, username, "PatentCheckRun", "PatentCheckResult", result.Id, $"Executed patent verification for ID: {patentNumber}. Risk: {riskLevel}", HttpContext.Connection.RemoteIpAddress?.ToString());

            // Recompute trust score
            await _trustScoreService.ComputeTrustScoreAsync(proposalId);

            return result;
        }
    }

    public class SubmitPatentInfoRequest
    {
        public int StartupId { get; set; }
        public string PatentStatus { get; set; } = string.Empty;
        public string? PatentNumber { get; set; }
        public DateTime? FilingDate { get; set; }
        public string? PatentDocumentUrl { get; set; }
    }

    public class PatentVerifyReviewRequest
    {
        public string Status { get; set; } = string.Empty; // "Verified", "Rejected"
    }
}
