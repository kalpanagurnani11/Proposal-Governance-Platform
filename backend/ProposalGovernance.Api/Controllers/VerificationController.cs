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
    public class VerificationController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly ITrustScoreService _trustScoreService;
        private readonly IAuditLogService _auditLogService;

        public VerificationController(
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

        // --- FOUNDER VERIFICATION ---

        [Authorize(Roles = UserRoles.Founder)]
        [HttpPost("founder/submit")]
        public async Task<IActionResult> SubmitFounderVerification([FromBody] SubmitFounderVerificationRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var existing = await _context.FounderVerifications
                .FirstOrDefaultAsync(fv => fv.UserId == userId);

            if (existing != null && existing.Status == "Verified")
            {
                return BadRequest(new { message = "You are already verified." });
            }

            if (existing == null)
            {
                existing = new FounderVerification { UserId = userId };
                await _context.FounderVerifications.AddAsync(existing);
            }

            existing.VerificationLevel = request.VerificationLevel; // "Basic", "Verified", "Business"
            existing.PanNumber = request.PanNumber;
            existing.AadhaarNumber = request.AadhaarNumber;
            existing.LinkedInUrl = request.LinkedInUrl;
            existing.GstNumber = request.GstNumber;
            existing.RegistrationNumber = request.RegistrationNumber;
            existing.CinNumber = request.CinNumber;
            existing.DocumentUrl = request.DocumentUrl;
            existing.Status = "Pending";
            existing.CheckedById = null;
            existing.CheckedAt = null;
            existing.Notes = request.Notes;

            // Auto-verify basic elements for mock/demo
            existing.EmailVerified = true;
            existing.MobileVerified = true;

            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync(userId, username, "SubmitFounderVerification", "FounderVerification", existing.Id, $"Submitted founder verification request for level '{request.VerificationLevel}'", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { success = true, message = "Founder verification request submitted successfully.", data = existing });
        }

        [HttpGet("founder/status")]
        public async Task<IActionResult> GetFounderVerificationStatus()
        {
            var userId = GetCurrentUserId();
            var verification = await _context.FounderVerifications
                .FirstOrDefaultAsync(fv => fv.UserId == userId);

            if (verification == null)
            {
                return Ok(new { hasRecord = false, status = "Unverified" });
            }

            return Ok(new { hasRecord = true, data = verification });
        }

        [HttpGet("founder/status/{userId}")]
        public async Task<IActionResult> GetFounderVerificationStatusById(int userId)
        {
            var verification = await _context.FounderVerifications
                .FirstOrDefaultAsync(fv => fv.UserId == userId);

            if (verification == null)
            {
                return Ok(new { hasRecord = false, status = "Unverified" });
            }

            return Ok(new { hasRecord = true, data = verification });
        }

        // --- STARTUP VERIFICATION ---

        [Authorize(Roles = UserRoles.Founder)]
        [HttpPost("startup/submit")]
        public async Task<IActionResult> SubmitStartupVerification([FromBody] SubmitStartupVerificationRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var proposal = await _context.Proposals
                .FirstOrDefaultAsync(p => p.Id == request.StartupId && p.SubmitterId == userId);

            if (proposal == null)
            {
                return NotFound(new { message = "Startup proposal not found or you do not own it." });
            }

            var existing = await _context.StartupVerifications
                .FirstOrDefaultAsync(sv => sv.StartupId == request.StartupId);

            if (existing == null)
            {
                existing = new StartupVerification { StartupId = request.StartupId };
                await _context.StartupVerifications.AddAsync(existing);
            }

            existing.RegistrationCertificateUrl = request.RegistrationCertificateUrl;
            existing.RegistrationCertificateStatus = "Pending";

            existing.GstDocumentUrl = request.GstDocumentUrl;
            existing.GstDocumentStatus = "Pending";

            existing.PanDocumentUrl = request.PanDocumentUrl;
            existing.PanDocumentStatus = "Pending";

            existing.FinancialStatementsUrl = request.FinancialStatementsUrl;
            existing.FinancialStatementsStatus = "Pending";

            existing.PitchDeckUrl = request.PitchDeckUrl;
            existing.PitchDeckStatus = "Pending";

            existing.OverallStatus = "Pending";
            existing.VerifiedById = null;
            existing.VerifiedAt = null;
            existing.Notes = request.Notes;

            await _context.SaveChangesAsync();
            await _auditLogService.LogAsync(userId, username, "SubmitStartupVerification", "StartupVerification", existing.Id, $"Submitted startup verification documents for proposal ID {request.StartupId}", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { success = true, message = "Startup verification documents submitted successfully.", data = existing });
        }

        [HttpGet("startup/{proposalId}")]
        public async Task<IActionResult> GetStartupVerificationStatus(int proposalId)
        {
            var verification = await _context.StartupVerifications
                .FirstOrDefaultAsync(sv => sv.StartupId == proposalId);

            if (verification == null)
            {
                return Ok(new { hasRecord = false, status = "Unverified" });
            }

            return Ok(new { hasRecord = true, data = verification });
        }

        // --- ADMIN MANAGEMENT ROUTES ---

        [Authorize(Roles = UserRoles.Admin)]
        [HttpGet("admin/pending")]
        public async Task<IActionResult> GetPendingVerifications()
        {
            var founders = await _context.FounderVerifications
                .Include(fv => fv.User)
                .Where(fv => fv.Status == "Pending")
                .ToListAsync();

            var startups = await _context.StartupVerifications
                .Include(sv => sv.Startup)
                .Where(sv => sv.OverallStatus == "Pending")
                .ToListAsync();

            var patents = await _context.StartupPatentInfos
                .Include(sp => sp.Startup)
                .Where(sp => sp.VerificationStatus == "Pending")
                .ToListAsync();

            return Ok(new { founders, startups, patents });
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("admin/approve/founder/{id}")]
        public async Task<IActionResult> ApproveFounder(int id, [FromBody] AdminReviewRequest request)
        {
            var adminId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var verification = await _context.FounderVerifications
                .Include(fv => fv.User)
                .FirstOrDefaultAsync(fv => fv.Id == id);

            if (verification == null) return NotFound(new { message = "Founder verification record not found." });

            verification.Status = "Verified";
            verification.CheckedById = adminId;
            verification.CheckedAt = DateTime.UtcNow;
            verification.Notes = request.Notes;

            // Set flags based on level to true
            verification.EmailVerified = true;
            verification.MobileVerified = true;
            if (verification.VerificationLevel == "Verified" || verification.VerificationLevel == "Business")
            {
                verification.PanVerified = true;
                verification.AadhaarVerified = true;
                verification.LinkedInVerified = true;
            }
            if (verification.VerificationLevel == "Business")
            {
                verification.GstVerified = true;
                verification.CompanyRegVerified = true;
                verification.CinVerified = true;
            }

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(adminId, username, "ApproveFounderVerification", "FounderVerification", id, $"Approved verification level '{verification.VerificationLevel}' for user '{verification.User?.Username}'", HttpContext.Connection.RemoteIpAddress?.ToString());

            // Recompute trust score for all submitter's proposals
            var proposals = await _context.Proposals.Where(p => p.SubmitterId == verification.UserId).ToListAsync();
            foreach (var p in proposals)
            {
                await _trustScoreService.ComputeTrustScoreAsync(p.Id);
            }

            return Ok(new { message = "Founder verified successfully.", data = verification });
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("admin/reject/founder/{id}")]
        public async Task<IActionResult> RejectFounder(int id, [FromBody] AdminReviewRequest request)
        {
            var adminId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var verification = await _context.FounderVerifications
                .Include(fv => fv.User)
                .FirstOrDefaultAsync(fv => fv.Id == id);

            if (verification == null) return NotFound(new { message = "Founder verification record not found." });

            verification.Status = "Rejected";
            verification.CheckedById = adminId;
            verification.CheckedAt = DateTime.UtcNow;
            verification.Notes = request.Notes;

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(adminId, username, "RejectFounderVerification", "FounderVerification", id, $"Rejected verification for user '{verification.User?.Username}'. Reason: {request.Notes}", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = "Founder verification rejected.", data = verification });
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("admin/approve/startup/{id}")]
        public async Task<IActionResult> ApproveStartup(int id, [FromBody] AdminReviewRequest request)
        {
            var adminId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var verification = await _context.StartupVerifications
                .Include(sv => sv.Startup)
                .FirstOrDefaultAsync(sv => sv.Id == id);

            if (verification == null) return NotFound(new { message = "Startup verification record not found." });

            verification.OverallStatus = "Verified";
            verification.RegistrationCertificateStatus = "Verified";
            verification.GstDocumentStatus = "Verified";
            verification.PanDocumentStatus = "Verified";
            verification.FinancialStatementsStatus = "Verified";
            verification.PitchDeckStatus = "Verified";

            verification.VerifiedById = adminId;
            verification.VerifiedAt = DateTime.UtcNow;
            verification.Notes = request.Notes;

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(adminId, username, "ApproveStartupVerification", "StartupVerification", id, $"Approved verification for startup '{verification.Startup?.StartupName}' (Proposal ID: {verification.StartupId})", HttpContext.Connection.RemoteIpAddress?.ToString());

            // Recompute trust score
            await _trustScoreService.ComputeTrustScoreAsync(verification.StartupId);

            return Ok(new { message = "Startup verified successfully.", data = verification });
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("admin/reject/startup/{id}")]
        public async Task<IActionResult> RejectStartup(int id, [FromBody] AdminReviewRequest request)
        {
            var adminId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var verification = await _context.StartupVerifications
                .Include(sv => sv.Startup)
                .FirstOrDefaultAsync(sv => sv.Id == id);

            if (verification == null) return NotFound(new { message = "Startup verification record not found." });

            verification.OverallStatus = "Rejected";
            verification.RegistrationCertificateStatus = "Rejected";
            verification.GstDocumentStatus = "Rejected";
            verification.PanDocumentStatus = "Rejected";
            verification.FinancialStatementsStatus = "Rejected";
            verification.PitchDeckStatus = "Rejected";

            verification.VerifiedById = adminId;
            verification.VerifiedAt = DateTime.UtcNow;
            verification.Notes = request.Notes;

            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(adminId, username, "RejectStartupVerification", "StartupVerification", id, $"Rejected verification for startup '{verification.Startup?.StartupName}' (Proposal ID: {verification.StartupId}). Reason: {request.Notes}", HttpContext.Connection.RemoteIpAddress?.ToString());

            // Recompute trust score
            await _trustScoreService.ComputeTrustScoreAsync(verification.StartupId);

            return Ok(new { message = "Startup verification rejected.", data = verification });
        }
    }

    public class SubmitFounderVerificationRequest
    {
        public string VerificationLevel { get; set; } = "Basic"; // "Basic", "Verified", "Business"
        public string? PanNumber { get; set; }
        public string? AadhaarNumber { get; set; }
        public string? LinkedInUrl { get; set; }
        public string? GstNumber { get; set; }
        public string? RegistrationNumber { get; set; }
        public string? CinNumber { get; set; }
        public string? DocumentUrl { get; set; }
        public string? Notes { get; set; }
    }

    public class SubmitStartupVerificationRequest
    {
        public int StartupId { get; set; }
        public string? RegistrationCertificateUrl { get; set; }
        public string? GstDocumentUrl { get; set; }
        public string? PanDocumentUrl { get; set; }
        public string? FinancialStatementsUrl { get; set; }
        public string? PitchDeckUrl { get; set; }
        public string? Notes { get; set; }
    }

    public class AdminReviewRequest
    {
        public string? Notes { get; set; }
    }
}
