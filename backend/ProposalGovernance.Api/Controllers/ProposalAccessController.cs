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
    public class ProposalAccessController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly INdaService _ndaService;
        private readonly IAuditLogService _auditLogService;

        public ProposalAccessController(
            GovernanceDbContext context,
            INdaService ndaService,
            IAuditLogService auditLogService)
        {
            _context = context;
            _ndaService = ndaService;
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

        // --- LEVEL 2 ACCESS REQUESTS ---

        [Authorize(Roles = UserRoles.Investor)]
        [HttpPost("request/{proposalId}")]
        public async Task<IActionResult> RequestAccess(int proposalId)
        {
            var investorId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var proposal = await _context.Proposals.FindAsync(proposalId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            var existing = await _context.ProposalAccessRequests
                .FirstOrDefaultAsync(r => r.StartupId == proposalId && r.InvestorId == investorId);

            if (existing != null)
            {
                return Ok(new { message = $"Access request is already {existing.Status}.", status = existing.Status });
            }

            var request = new ProposalAccessRequest
            {
                StartupId = proposalId,
                InvestorId = investorId,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow
            };

            await _context.ProposalAccessRequests.AddAsync(request);
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(investorId, username, "RequestAccess", "Proposal", proposalId, $"Investor requested access to confidential sections of proposal '{proposal.Title}'", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = "Access request sent successfully.", status = "Pending" });
        }

        [HttpGet("status/{proposalId}")]
        public async Task<IActionResult> GetAccessStatus(int proposalId)
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return Unauthorized();

            if (user.Role == UserRoles.Admin || user.Role == UserRoles.Reviewer)
            {
                return Ok(new { level2Approved = true, level3NdaAccepted = true, roleOverride = true });
            }

            var proposal = await _context.Proposals.FindAsync(proposalId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            if (proposal.SubmitterId == userId)
            {
                return Ok(new { level2Approved = true, level3NdaAccepted = true, isOwner = true });
            }

            var accessRequest = await _context.ProposalAccessRequests
                .FirstOrDefaultAsync(r => r.StartupId == proposalId && r.InvestorId == userId);
            
            var ndaAccepted = await _ndaService.HasAcceptedNdaAsync(userId, proposalId);

            return Ok(new
            {
                level2Status = accessRequest?.Status ?? "None",
                level2Approved = accessRequest?.Status == "Approved",
                level3NdaAccepted = ndaAccepted
            });
        }

        [Authorize(Roles = UserRoles.Founder)]
        [HttpGet("pending-requests")]
        public async Task<IActionResult> GetMyPendingRequests()
        {
            var founderId = GetCurrentUserId();

            var requests = await _context.ProposalAccessRequests
                .Include(r => r.Startup)
                .Include(r => r.Investor)
                .Where(r => r.Startup!.SubmitterId == founderId && r.Status == "Pending")
                .Select(r => new {
                    r.Id,
                    r.StartupId,
                    StartupTitle = r.Startup!.Title,
                    r.InvestorId,
                    InvestorName = r.Investor!.FullName,
                    InvestorEmail = r.Investor.Email,
                    r.Status,
                    r.RequestedAt
                })
                .ToListAsync();

            return Ok(requests);
        }

        [Authorize(Roles = UserRoles.Founder)]
        [HttpPost("approve/{requestId}")]
        public async Task<IActionResult> ApproveRequest(int requestId)
        {
            var founderId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var request = await _context.ProposalAccessRequests
                .Include(r => r.Startup)
                .Include(r => r.Investor)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null) return NotFound(new { message = "Access request not found." });

            if (request.Startup!.SubmitterId != founderId)
            {
                return Unauthorized(new { message = "You are not authorized to approve requests for this startup." });
            }

            request.Status = "Approved";
            request.ApprovedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(founderId, username, "ApproveAccessRequest", "ProposalAccessRequest", requestId, $"Approved investor '{request.Investor!.FullName}' (ID: {request.InvestorId}) for proposal '{request.Startup.Title}'", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = "Request approved." });
        }

        [Authorize(Roles = UserRoles.Founder)]
        [HttpPost("reject/{requestId}")]
        public async Task<IActionResult> RejectRequest(int requestId)
        {
            var founderId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var request = await _context.ProposalAccessRequests
                .Include(r => r.Startup)
                .Include(r => r.Investor)
                .FirstOrDefaultAsync(r => r.Id == requestId);

            if (request == null) return NotFound(new { message = "Access request not found." });

            if (request.Startup!.SubmitterId != founderId)
            {
                return Unauthorized(new { message = "You are not authorized to reject requests for this startup." });
            }

            request.Status = "Rejected";
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(founderId, username, "RejectAccessRequest", "ProposalAccessRequest", requestId, $"Rejected investor '{request.Investor!.FullName}' (ID: {request.InvestorId}) for proposal '{request.Startup.Title}'", HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = "Request rejected." });
        }

        // --- LEVEL 3 NDA ACCEPTANCES ---

        [Authorize(Roles = UserRoles.Investor)]
        [HttpPost("nda/accept/{proposalId}")]
        public async Task<IActionResult> AcceptNda(int proposalId)
        {
            var investorId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var proposal = await _context.Proposals.FindAsync(proposalId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            // Check if level 2 approved
            var accessRequest = await _context.ProposalAccessRequests
                .FirstOrDefaultAsync(r => r.StartupId == proposalId && r.InvestorId == investorId && r.Status == "Approved");

            if (accessRequest == null)
            {
                return BadRequest(new { message = "You must be approved for Level 2 access before signing the NDA." });
            }

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var nda = await _ndaService.AcceptNdaAsync(investorId, proposalId, ip);

            await _auditLogService.LogAsync(investorId, username, "AcceptNDA", "NDAAgreement", nda.Id, $"Signed NDA Version {nda.Version} for proposal '{proposal.Title}' at IP: {ip}", ip);

            return Ok(new { success = true, message = "NDA accepted successfully. Confidential files unlocked." });
        }

        // --- VIEW AND DOWNLOAD LOGGING ---

        [HttpPost("log-view/{proposalId}")]
        public async Task<IActionResult> LogProposalView(int proposalId)
        {
            var userId = GetCurrentUserId();
            var username = GetCurrentUsername();
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

            var view = new ProposalView
            {
                ProposalId = proposalId,
                UserId = userId == 0 ? null : userId,
                ViewedAt = DateTime.UtcNow,
                IpAddress = ip
            };

            await _context.ProposalViews.AddAsync(view);
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(userId == 0 ? null : userId, username, "ViewProposal", "Proposal", proposalId, $"Viewed proposal ID {proposalId}", ip);

            return Ok();
        }

        [HttpPost("log-download/{proposalId}")]
        public async Task<IActionResult> LogDocumentDownload(int proposalId, [FromBody] DownloadLogRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var investorId = GetCurrentUserId();
            var investor = await _context.Users.FindAsync(investorId);
            if (investor == null) return Unauthorized();

            var proposal = await _context.Proposals.FindAsync(proposalId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC");
            
            // Build watermark metadata as required
            // "Watermark every downloaded document with: Investor Name, Investor Email, Timestamp, Document ID"
            string watermarkText = $"CONFIDENTIAL | Licensed to {investor.FullName} ({investor.Email}) | Downloaded at {timestamp} | DocRef: {request.DocumentType}-{proposalId}";

            var download = new DocumentDownload
            {
                ProposalId = proposalId,
                UserId = investorId,
                DocumentType = request.DocumentType,
                DocumentName = request.DocumentName,
                DownloadedAt = DateTime.UtcNow,
                WatermarkText = watermarkText,
                IpAddress = ip
            };

            await _context.DocumentDownloads.AddAsync(download);
            await _context.SaveChangesAsync();

            await _auditLogService.LogAsync(investorId, investor.Username, "DownloadDocument", "Document", proposalId, $"Downloaded {request.DocumentType} ({request.DocumentName}) with watermark: '{watermarkText}'", ip);

            return Ok(new
            {
                success = true,
                watermark = watermarkText,
                message = "Download logged and watermarked."
            });
        }
    }

    public class DownloadLogRequest
    {
        public string DocumentType { get; set; } = string.Empty; // "PitchDeck", "FinancialReport", "PatentDocument", "ConfidentialFile"
        public string DocumentName { get; set; } = string.Empty;
    }
}
