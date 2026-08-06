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
using ProposalGovernance.Api.Validators;

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

            var level = request.VerificationLevel ?? "Basic";
            var pan = request.PanNumber?.Trim().ToUpper();
            var aadhaar = request.AadhaarNumber?.Trim();
            var gst = request.GstNumber?.Trim().ToUpper();
            var cin = request.CinNumber?.Trim().ToUpper();
            var linkedIn = request.LinkedInUrl?.Trim();

            // 1. Validate format of any non-empty provided field regardless of tier
            if (!string.IsNullOrWhiteSpace(pan) && !ValidationHelpers.IsValidPan(pan))
            {
                return BadRequest(new { message = "A valid 10-character PAN Card Number is required (e.g. ABCDE1234F)." });
            }

            if (!string.IsNullOrWhiteSpace(aadhaar) && !ValidationHelpers.IsValidAadhaar(aadhaar))
            {
                return BadRequest(new { message = "A valid 12-digit Aadhaar Card Number is required." });
            }

            if (!string.IsNullOrWhiteSpace(linkedIn) && !ValidationHelpers.IsValidUrl(linkedIn))
            {
                return BadRequest(new { message = "A valid LinkedIn Profile URL is required starting with http:// or https://" });
            }

            if (!string.IsNullOrWhiteSpace(gst) && !ValidationHelpers.IsValidGst(gst))
            {
                return BadRequest(new { message = "A valid 15-character GSTIN Number is required (e.g. 22AAAAA0000A1Z5)." });
            }

            if (!string.IsNullOrWhiteSpace(cin) && !ValidationHelpers.IsValidCin(cin))
            {
                return BadRequest(new { message = "A valid 21-character CIN Number is required (e.g. L12345MH2020PLC12345)." });
            }

            // 2. Enforce tier-specific mandatory fields
            if (level == "Verified" || level == "Business")
            {
                if (string.IsNullOrWhiteSpace(pan) || !ValidationHelpers.IsValidPan(pan))
                {
                    return BadRequest(new { message = "A valid 10-character PAN Card Number is required for 'Verified' tier." });
                }
                if (string.IsNullOrWhiteSpace(aadhaar) || !ValidationHelpers.IsValidAadhaar(aadhaar))
                {
                    return BadRequest(new { message = "A valid 12-digit Aadhaar Card Number is required for 'Verified' tier." });
                }
            }

            if (level == "Business")
            {
                if (string.IsNullOrWhiteSpace(gst) || !ValidationHelpers.IsValidGst(gst))
                {
                    return BadRequest(new { message = "A valid 15-character GSTIN Number is required for 'Business' tier." });
                }
                if (string.IsNullOrWhiteSpace(request.RegistrationNumber))
                {
                    return BadRequest(new { message = "Company Registration Number is required for 'Business' tier." });
                }
                if (string.IsNullOrWhiteSpace(cin) || !ValidationHelpers.IsValidCin(cin))
                {
                    return BadRequest(new { message = "A valid 21-character CIN Number is required for 'Business' tier." });
                }
            }

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

            existing.VerificationLevel = level;
            existing.PanNumber = pan;
            existing.AadhaarNumber = aadhaar;
            existing.LinkedInUrl = linkedIn;
            existing.GstNumber = gst;
            existing.RegistrationNumber = request.RegistrationNumber?.Trim();
            existing.CinNumber = cin;
            existing.DocumentUrl = request.DocumentUrl?.Trim();
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

        [Authorize(Roles = UserRoles.Admin)]
        [HttpGet("admin/all")]
        public async Task<IActionResult> GetAllVerifications()
        {
            var founders = await _context.FounderVerifications
                .Include(fv => fv.User)
                .Include(fv => fv.CheckedBy)
                .OrderByDescending(fv => fv.Id)
                .ToListAsync();

            var startups = await _context.StartupVerifications
                .Include(sv => sv.Startup)
                    .ThenInclude(s => s!.Submitter)
                .Include(sv => sv.VerifiedBy)
                .OrderByDescending(sv => sv.Id)
                .ToListAsync();

            var patents = await _context.StartupPatentInfos
                .Include(sp => sp.Startup)
                    .ThenInclude(s => s!.Submitter)
                .Include(sp => sp.VerifiedBy)
                .OrderByDescending(sp => sp.Id)
                .ToListAsync();

            return Ok(new { founders, startups, patents });
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpGet("admin/reviewers")]
        public async Task<IActionResult> GetReviewers()
        {
            var reviewers = await _context.Users
                .Where(u => u.Role == UserRoles.Reviewer)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.Department
                })
                .ToListAsync();

            return Ok(reviewers);
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("admin/assign-reviewer/{type}/{id}")]
        public async Task<IActionResult> AssignReviewer(string type, int id, [FromBody] AssignReviewerRequest request)
        {
            var adminId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var reviewer = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.ReviewerId && u.Role == UserRoles.Reviewer);
            if (reviewer == null) return BadRequest(new { message = "Selected reviewer does not exist or is not a Reviewer." });

            if (type.ToLower() == "founder")
            {
                var fv = await _context.FounderVerifications.FirstOrDefaultAsync(f => f.Id == id);
                if (fv == null) return NotFound(new { message = "Founder verification record not found." });

                fv.CheckedById = request.ReviewerId;
                fv.Status = "UnderReview";
                fv.Notes = string.IsNullOrWhiteSpace(request.Notes) ? fv.Notes : request.Notes;
                await _context.SaveChangesAsync();
                await _auditLogService.LogAsync(adminId, username, "AssignReviewerFounder", "FounderVerification", id, $"Assigned Reviewer '{reviewer.FullName}' (ID: {reviewer.Id}) to Founder verification.", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { message = $"Reviewer {reviewer.FullName} assigned successfully.", data = fv });
            }
            else if (type.ToLower() == "startup")
            {
                var sv = await _context.StartupVerifications.FirstOrDefaultAsync(s => s.Id == id);
                if (sv == null) return NotFound(new { message = "Startup verification record not found." });

                sv.VerifiedById = request.ReviewerId;
                sv.OverallStatus = "UnderReview";
                sv.Notes = string.IsNullOrWhiteSpace(request.Notes) ? sv.Notes : request.Notes;
                await _context.SaveChangesAsync();
                await _auditLogService.LogAsync(adminId, username, "AssignReviewerStartup", "StartupVerification", id, $"Assigned Reviewer '{reviewer.FullName}' (ID: {reviewer.Id}) to Startup verification.", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { message = $"Reviewer {reviewer.FullName} assigned successfully.", data = sv });
            }
            else if (type.ToLower() == "patent")
            {
                var sp = await _context.StartupPatentInfos.FirstOrDefaultAsync(p => p.Id == id || p.StartupId == id);
                if (sp == null) return NotFound(new { message = "Patent verification record not found." });

                sp.VerifiedById = request.ReviewerId;
                sp.VerificationStatus = "UnderReview";
                await _context.SaveChangesAsync();
                await _auditLogService.LogAsync(adminId, username, "AssignReviewerPatent", "StartupPatentInfo", sp.Id, $"Assigned Reviewer '{reviewer.FullName}' (ID: {reviewer.Id}) to Patent verification.", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { message = $"Reviewer {reviewer.FullName} assigned successfully.", data = sp });
            }

            return BadRequest(new { message = "Invalid verification type." });
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("admin/request-docs/{type}/{id}")]
        public async Task<IActionResult> RequestDocuments(string type, int id, [FromBody] AdminReviewRequest request)
        {
            var adminId = GetCurrentUserId();
            var username = GetCurrentUsername();

            if (type.ToLower() == "founder")
            {
                var fv = await _context.FounderVerifications.FirstOrDefaultAsync(f => f.Id == id);
                if (fv == null) return NotFound(new { message = "Founder verification record not found." });

                fv.Status = "NeedsMoreDocuments";
                fv.Notes = request.Notes;
                await _context.SaveChangesAsync();
                await _auditLogService.LogAsync(adminId, username, "RequestDocsFounder", "FounderVerification", id, $"Requested additional documents. Notes: {request.Notes}", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { message = "Additional documents requested from Founder.", data = fv });
            }
            else if (type.ToLower() == "startup")
            {
                var sv = await _context.StartupVerifications.FirstOrDefaultAsync(s => s.Id == id);
                if (sv == null) return NotFound(new { message = "Startup verification record not found." });

                sv.OverallStatus = "NeedsMoreDocuments";
                sv.Notes = request.Notes;
                await _context.SaveChangesAsync();
                await _auditLogService.LogAsync(adminId, username, "RequestDocsStartup", "StartupVerification", id, $"Requested additional documents for Startup. Notes: {request.Notes}", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { message = "Additional documents requested for Startup.", data = sv });
            }
            else if (type.ToLower() == "patent")
            {
                var sp = await _context.StartupPatentInfos.FirstOrDefaultAsync(p => p.Id == id || p.StartupId == id);
                if (sp == null) return NotFound(new { message = "Patent verification record not found." });

                sp.VerificationStatus = "NeedsMoreDocuments";
                await _context.SaveChangesAsync();
                await _auditLogService.LogAsync(adminId, username, "RequestDocsPatent", "StartupPatentInfo", sp.Id, $"Requested additional patent documents. Notes: {request.Notes}", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { message = "Additional patent documentation requested.", data = sp });
            }

            return BadRequest(new { message = "Invalid verification type." });
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
