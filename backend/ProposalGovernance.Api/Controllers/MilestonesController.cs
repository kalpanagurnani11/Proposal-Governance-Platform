using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Hubs;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Repositories;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MilestonesController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly IProposalRepository _proposalRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IHubContext<NotificationHub> _hubContext;

        public MilestonesController(
            GovernanceDbContext context,
            IProposalRepository proposalRepository,
            INotificationRepository notificationRepository,
            IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _proposalRepository = proposalRepository;
            _notificationRepository = notificationRepository;
            _hubContext = hubContext;
        }

        // ────────────────────────────────────────────────
        // MILESTONES
        // ────────────────────────────────────────────────

        [HttpGet("proposal/{proposalId}")]
        public async Task<IActionResult> GetMilestones(int proposalId)
        {
            var milestones = await _context.Milestones
                .Where(m => m.ProposalId == proposalId)
                .OrderBy(m => m.OrderIndex)
                .ThenBy(m => m.TargetDate)
                .ToListAsync();
            return Ok(milestones);
        }

        [HttpPost]
        public async Task<IActionResult> AddMilestone([FromBody] AddMilestoneRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var proposal = await _proposalRepository.GetByIdAsync(request.ProposalId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            // Only submitter of the proposal or admin can add milestones
            if (role != UserRoles.Admin && proposal.SubmitterId != userId)
                return Forbid();

            var milestone = new Milestone
            {
                ProposalId = request.ProposalId,
                Title = request.Title,
                Description = request.Description,
                TargetDate = request.TargetDate,
                OrderIndex = request.OrderIndex,
                Status = MilestoneStatuses.Pending
            };

            _context.Milestones.Add(milestone);
            await _context.SaveChangesAsync();

            return Ok(milestone);
        }

        [HttpPut("{id}/achieve")]
        public async Task<IActionResult> MarkAchieved(int id, [FromBody] AchieveMilestoneRequest request)
        {
            var milestone = await _context.Milestones
                .Include(m => m.Proposal)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (milestone == null) return NotFound(new { message = "Milestone not found." });

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            if (role != UserRoles.Admin && milestone.Proposal?.SubmitterId != userId)
                return Forbid();

            milestone.Status = MilestoneStatuses.Achieved;
            milestone.AchievedAt = DateTime.UtcNow;
            milestone.ProofDocumentUrl = request.ProofDocumentUrl;
            await _context.SaveChangesAsync();

            // Notify all investors of this proposal
            var investments = await _context.Investments
                .Where(i => i.ProposalId == milestone.ProposalId)
                .ToListAsync();

            foreach (var inv in investments)
            {
                var notif = new Notification
                {
                    UserId = inv.InvestorId,
                    Title = "Milestone Achieved ✅",
                    Message = $"Milestone '{milestone.Title}' has been achieved for project '{milestone.Proposal!.Title}'."
                };
                _context.Notifications.Add(notif);
                await _context.SaveChangesAsync();
                await _hubContext.Clients.Group($"User_{inv.InvestorId}").SendAsync("ReceiveNotification", new
                {
                    id = notif.Id,
                    title = notif.Title,
                    message = notif.Message,
                    createdAt = notif.CreatedAt,
                    isRead = false
                });
            }

            return Ok(milestone);
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPut("{id}/miss")]
        public async Task<IActionResult> MarkMissed(int id, [FromBody] MissMilestoneRequest request)
        {
            var milestone = await _context.Milestones
                .Include(m => m.Proposal)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (milestone == null) return NotFound(new { message = "Milestone not found." });

            milestone.Status = MilestoneStatuses.Missed;
            milestone.AdminNotes = request.AdminNotes;
            await _context.SaveChangesAsync();

            // Notify submitter
            if (milestone.Proposal != null)
            {
                var notif = new Notification
                {
                    UserId = milestone.Proposal.SubmitterId,
                    Title = "Milestone Marked as Missed ⚠️",
                    Message = $"Milestone '{milestone.Title}' was marked as MISSED by admin. Notes: {request.AdminNotes}"
                };
                _context.Notifications.Add(notif);
                await _context.SaveChangesAsync();
                await _hubContext.Clients.Group($"User_{milestone.Proposal.SubmitterId}").SendAsync("ReceiveNotification", new
                {
                    id = notif.Id,
                    title = notif.Title,
                    message = notif.Message,
                    createdAt = notif.CreatedAt,
                    isRead = false
                });
            }

            return Ok(milestone);
        }

        // ────────────────────────────────────────────────
        // PROGRESS UPDATES
        // ────────────────────────────────────────────────

        [HttpGet("updates/proposal/{proposalId}")]
        public async Task<IActionResult> GetProgressUpdates(int proposalId)
        {
            var updates = await _context.ProgressUpdates
                .Include(u => u.Author)
                .Where(u => u.ProposalId == proposalId)
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();

            return Ok(updates.Select(u => new
            {
                u.Id,
                u.ProposalId,
                u.Title,
                u.Content,
                u.UpdateType,
                u.OverallProgress,
                u.AttachmentUrl,
                u.CreatedAt,
                Author = u.Author == null ? null : new { u.Author.Id, u.Author.FullName, u.Author.Role }
            }));
        }

        [HttpPost("updates")]
        public async Task<IActionResult> PostProgressUpdate([FromBody] PostProgressUpdateRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var proposal = await _proposalRepository.GetByIdAsync(request.ProposalId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            if (role != UserRoles.Admin && proposal.SubmitterId != userId)
                return Forbid();

            var update = new ProgressUpdate
            {
                ProposalId = request.ProposalId,
                AuthorId = userId,
                Title = request.Title,
                Content = request.Content,
                UpdateType = request.UpdateType ?? "General",
                OverallProgress = request.OverallProgress,
                AttachmentUrl = request.AttachmentUrl
            };

            _context.ProgressUpdates.Add(update);
            await _context.SaveChangesAsync();

            // Notify investors
            var investments = await _context.Investments
                .Where(i => i.ProposalId == request.ProposalId)
                .ToListAsync();

            foreach (var inv in investments)
            {
                var notif = new Notification
                {
                    UserId = inv.InvestorId,
                    Title = "New Progress Update 📊",
                    Message = $"Project '{proposal.Title}' posted a new update: '{request.Title}'"
                };
                _context.Notifications.Add(notif);
                await _context.SaveChangesAsync();
                await _hubContext.Clients.Group($"User_{inv.InvestorId}").SendAsync("ReceiveNotification", new
                {
                    id = notif.Id,
                    title = notif.Title,
                    message = notif.Message,
                    createdAt = notif.CreatedAt,
                    isRead = false
                });
            }

            return Ok(update);
        }

        // ────────────────────────────────────────────────
        // PROJECT CLOSURE
        // ────────────────────────────────────────────────

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("close/{proposalId}")]
        public async Task<IActionResult> CloseProject(int proposalId, [FromBody] CloseProjectRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var proposal = await _proposalRepository.GetByIdAsync(proposalId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            var allowedStatuses = new[] { ProposalStatuses.FundAllocated, ProposalStatuses.Active };
            if (!allowedStatuses.Contains(proposal.Status))
                return BadRequest(new { message = $"Cannot close a project with status '{proposal.Status}'. Only FundAllocated or Active projects can be closed." });

            var newStatus = request.Outcome == "Completed" ? ProposalStatuses.Completed : ProposalStatuses.Terminated;
            proposal.Status = newStatus;
            proposal.UpdatedAt = DateTime.UtcNow;
            await _proposalRepository.SaveChangesAsync();

            // Post a closure progress update
            var closureNote = new ProgressUpdate
            {
                ProposalId = proposalId,
                AuthorId = 1, // Admin
                Title = $"Project {newStatus} — Final Report",
                Content = request.FinalReport,
                UpdateType = "Closure",
                OverallProgress = request.Outcome == "Completed" ? 100m : request.CompletionPercentage
            };
            _context.ProgressUpdates.Add(closureNote);
            await _context.SaveChangesAsync();

            // Notify submitter + investors
            var investments = await _context.Investments
                .Where(i => i.ProposalId == proposalId)
                .ToListAsync();

            var allRecipients = investments.Select(i => i.InvestorId).ToList();
            allRecipients.Add(proposal.SubmitterId);

            foreach (var recipientId in allRecipients.Distinct())
            {
                var notif = new Notification
                {
                    UserId = recipientId,
                    Title = newStatus == ProposalStatuses.Completed ? "Project Completed 🏆" : "Project Terminated ❌",
                    Message = $"Project '{proposal.Title}' has been officially {newStatus.ToLower()} by the admin."
                };
                _context.Notifications.Add(notif);
                await _context.SaveChangesAsync();
                await _hubContext.Clients.Group($"User_{recipientId}").SendAsync("ReceiveNotification", new
                {
                    id = notif.Id,
                    title = notif.Title,
                    message = notif.Message,
                    createdAt = notif.CreatedAt,
                    isRead = false
                });
            }

            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(new { message = $"Project successfully marked as {newStatus}.", status = newStatus });
        }

        // ────────────────────────────────────────────────
        // DIVIDEND / EQUITY RETURNS
        // ────────────────────────────────────────────────

        [HttpGet("dividends/proposal/{proposalId}")]
        public async Task<IActionResult> GetDividendsByProposal(int proposalId)
        {
            var payouts = await _context.DividendPayouts
                .Include(d => d.Investor)
                .Where(d => d.ProposalId == proposalId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return Ok(payouts.Select(d => new
            {
                d.Id,
                d.ProposalId,
                d.PayoutAmount,
                d.EquityPercentage,
                d.RevenueBase,
                d.Notes,
                d.Status,
                d.PayoutDate,
                d.CreatedAt,
                Investor = d.Investor == null ? null : new { d.Investor.Id, d.Investor.FullName, d.Investor.Email }
            }));
        }

        [HttpGet("dividends/investor/{investorId}")]
        public async Task<IActionResult> GetDividendsByInvestor(int investorId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            if (role != UserRoles.Admin && userId != investorId)
                return Forbid();

            var payouts = await _context.DividendPayouts
                .Include(d => d.Proposal)
                .Where(d => d.InvestorId == investorId)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            return Ok(payouts.Select(d => new
            {
                d.Id,
                d.ProposalId,
                ProposalTitle = d.Proposal?.Title,
                d.PayoutAmount,
                d.EquityPercentage,
                d.RevenueBase,
                d.Notes,
                d.Status,
                d.PayoutDate,
                d.CreatedAt
            }));
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("dividends/distribute")]
        public async Task<IActionResult> DistributeDividends([FromBody] DistributeDividendRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var proposal = await _proposalRepository.GetByIdAsync(request.ProposalId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            // Get all active investments for this proposal
            var investments = await _context.Investments
                .Include(i => i.Investor)
                .Where(i => i.ProposalId == request.ProposalId && i.Status == "Active")
                .ToListAsync();

            if (!investments.Any())
                return BadRequest(new { message = "No active investors found for this proposal." });

            // Calculate total equity committed
            decimal totalEquity = proposal.EquityOffered;
            decimal totalInvested = investments.Sum(i => i.CommittedAmount);

            var payouts = new List<DividendPayout>();

            foreach (var inv in investments)
            {
                // Proportional share: investor's committed amount / total invested * equity offered
                decimal investorEquityShare = totalInvested > 0
                    ? (inv.CommittedAmount / totalInvested) * totalEquity
                    : 0;

                decimal payoutAmount = Math.Round((investorEquityShare / 100m) * request.RevenueAmount, 2);

                var payout = new DividendPayout
                {
                    ProposalId = request.ProposalId,
                    InvestorId = inv.InvestorId,
                    PayoutAmount = payoutAmount,
                    EquityPercentage = investorEquityShare,
                    RevenueBase = request.RevenueAmount,
                    Notes = request.Notes,
                    Status = "Processed",
                    PayoutDate = DateTime.UtcNow
                };

                payouts.Add(payout);
                _context.DividendPayouts.Add(payout);
                await _context.SaveChangesAsync();

                // Notify investor
                var notif = new Notification
                {
                    UserId = inv.InvestorId,
                    Title = "Equity Return Received 💹",
                    Message = $"You received a dividend of {payoutAmount:C} ({investorEquityShare:F2}% equity) from project '{proposal.Title}'."
                };
                _context.Notifications.Add(notif);
                await _context.SaveChangesAsync();

                await _hubContext.Clients.Group($"User_{inv.InvestorId}").SendAsync("ReceiveNotification", new
                {
                    id = notif.Id,
                    title = notif.Title,
                    message = notif.Message,
                    createdAt = notif.CreatedAt,
                    isRead = false
                });
            }

            return Ok(new
            {
                message = $"Distributed dividends to {payouts.Count} investor(s).",
                totalDistributed = payouts.Sum(p => p.PayoutAmount),
                payouts
            });
        }

        // ────────────────────────────────────────────────
        // ACTIVATE PROJECT (FundAllocated → Active)
        // ────────────────────────────────────────────────

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("activate/{proposalId}")]
        public async Task<IActionResult> ActivateProject(int proposalId)
        {
            var proposal = await _proposalRepository.GetByIdAsync(proposalId);
            if (proposal == null) return NotFound(new { message = "Proposal not found." });

            if (proposal.Status != ProposalStatuses.FundAllocated)
                return BadRequest(new { message = "Only FundAllocated proposals can be activated." });

            proposal.Status = ProposalStatuses.Active;
            proposal.UpdatedAt = DateTime.UtcNow;
            await _proposalRepository.SaveChangesAsync();

            // Notify submitter
            var notif = new Notification
            {
                UserId = proposal.SubmitterId,
                Title = "Project Activated 🚀",
                Message = $"Your project '{proposal.Title}' is now ACTIVE. You can now add milestones and post progress updates."
            };
            _context.Notifications.Add(notif);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.Group($"User_{proposal.SubmitterId}").SendAsync("ReceiveNotification", new
            {
                id = notif.Id,
                title = notif.Title,
                message = notif.Message,
                createdAt = notif.CreatedAt,
                isRead = false
            });

            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(new { message = "Project activated.", status = ProposalStatuses.Active });
        }
    }

    // ── Request DTOs ───────────────────────────────────────────────────────────

    public class AddMilestoneRequest
    {
        public int ProposalId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime TargetDate { get; set; }
        public int OrderIndex { get; set; } = 0;
    }

    public class AchieveMilestoneRequest
    {
        public string? ProofDocumentUrl { get; set; }
    }

    public class MissMilestoneRequest
    {
        public string? AdminNotes { get; set; }
    }

    public class PostProgressUpdateRequest
    {
        public int ProposalId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? UpdateType { get; set; }
        public decimal? OverallProgress { get; set; }
        public string? AttachmentUrl { get; set; }
    }

    public class CloseProjectRequest
    {
        public string Outcome { get; set; } = "Completed"; // "Completed" or "Terminated"
        public string FinalReport { get; set; } = string.Empty;
        public decimal? CompletionPercentage { get; set; }
    }

    public class DistributeDividendRequest
    {
        public int ProposalId { get; set; }
        public decimal RevenueAmount { get; set; }
        public string? Notes { get; set; }
    }
}
