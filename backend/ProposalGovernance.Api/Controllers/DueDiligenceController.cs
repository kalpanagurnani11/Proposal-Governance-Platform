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
    public class DueDiligenceController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly ITrustScoreService _trustScoreService;
        private readonly IAuditLogService _auditLogService;

        public DueDiligenceController(
            GovernanceDbContext context,
            ITrustScoreService trustScoreService,
            IAuditLogService auditLogService)
        {
            _context = context;
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

        [Authorize(Roles = UserRoles.Reviewer)]
        [HttpPost]
        public async Task<IActionResult> SubmitDueDiligence([FromBody] SubmitDueDiligenceRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var proposal = await _context.Proposals.FindAsync(request.StartupId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            var reviewerId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var report = new DueDiligenceReport
            {
                StartupId = request.StartupId,
                ReviewerId = reviewerId,
                InnovationScore = request.InnovationScore,
                MarketPotentialScore = request.MarketPotentialScore,
                FeasibilityScore = request.FeasibilityScore,
                TeamStrengthScore = request.TeamStrengthScore,
                FinancialReadinessScore = request.FinancialReadinessScore,
                RiskAssessmentScore = request.RiskAssessmentScore,
                PatentStrengthScore = request.PatentStrengthScore,
                IpStrengthScore = request.IpStrengthScore,
                Summary = request.Summary,
                CreatedAt = DateTime.UtcNow
            };

            await _context.DueDiligenceReports.AddAsync(report);
            
            // Set proposal status to UnderReview or Reviewed if needed
            proposal.Status = ProposalStatuses.Reviewed;
            proposal.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(reviewerId, username, "SubmitDueDiligenceReport", "DueDiligenceReport", report.Id, $"Submitted full due diligence report for proposal '{proposal.Title}'", HttpContext.Connection.RemoteIpAddress?.ToString());

            // Recompute trust score!
            await _trustScoreService.ComputeTrustScoreAsync(request.StartupId);

            return Ok(new { success = true, reportId = report.Id, message = "Due Diligence Report submitted successfully." });
        }

        [HttpGet("{proposalId}")]
        public async Task<IActionResult> GetReport(int proposalId)
        {
            var report = await _context.DueDiligenceReports
                .Include(r => r.Reviewer)
                .Where(r => r.StartupId == proposalId)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            if (report == null) return NotFound(new { message = "No due diligence report exists for this startup." });

            return Ok(new
            {
                report.Id,
                report.StartupId,
                reviewerName = report.Reviewer?.FullName ?? "Reviewer",
                report.InnovationScore,
                report.MarketPotentialScore,
                report.FeasibilityScore,
                report.TeamStrengthScore,
                report.FinancialReadinessScore,
                report.RiskAssessmentScore,
                report.PatentStrengthScore,
                report.IpStrengthScore,
                report.Summary,
                report.CreatedAt
            });
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpGet("all")]
        public async Task<IActionResult> GetAllReports()
        {
            var reports = await _context.DueDiligenceReports
                .Include(r => r.Startup)
                .Include(r => r.Reviewer)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(reports);
        }
    }

    public class SubmitDueDiligenceRequest
    {
        public int StartupId { get; set; }
        public int InnovationScore { get; set; }
        public int MarketPotentialScore { get; set; }
        public int FeasibilityScore { get; set; }
        public int TeamStrengthScore { get; set; }
        public int FinancialReadinessScore { get; set; }
        public int RiskAssessmentScore { get; set; }
        public int PatentStrengthScore { get; set; }
        public int IpStrengthScore { get; set; }
        public string Summary { get; set; } = string.Empty;
    }
}
