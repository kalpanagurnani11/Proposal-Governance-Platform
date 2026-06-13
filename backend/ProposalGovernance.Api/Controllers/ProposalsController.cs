using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ProposalGovernance.Api.Hubs;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Repositories;
using ProposalGovernance.Api.Services;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ProposalsController : ControllerBase
    {
        private readonly IProposalRepository _proposalRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IEmailService _emailService;
        private readonly IAiAnalysisService _aiAnalysisService;
        private readonly IHubContext<NotificationHub> _hubContext;

        public ProposalsController(
            IProposalRepository proposalRepository,
            IUserRepository userRepository,
            INotificationRepository notificationRepository,
            IEmailService emailService,
            IAiAnalysisService aiAnalysisService,
            IHubContext<NotificationHub> hubContext)
        {
            _proposalRepository = proposalRepository;
            _userRepository = userRepository;
            _notificationRepository = notificationRepository;
            _emailService = emailService;
            _aiAnalysisService = aiAnalysisService;
            _hubContext = hubContext;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null ? int.Parse(claim.Value) : 0;
        }

        private string GetCurrentUserRole()
        {
            var claim = User.FindFirst(ClaimTypes.Role);
            return claim != null ? claim.Value : string.Empty;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var role = GetCurrentUserRole();
            var userId = GetCurrentUserId();

            if (role == UserRoles.Admin)
            {
                var proposals = await _proposalRepository.GetAllAsync();
                return Ok(proposals);
            }
            else if (role == UserRoles.Submitter)
            {
                var proposals = await _proposalRepository.GetBySubmitterIdAsync(userId);
                return Ok(proposals);
            }
            else if (role == UserRoles.Reviewer)
            {
                // Reviewers see proposals that are Submitted, UnderReview, or Reviewed
                var allProposals = await _proposalRepository.GetAllAsync();
                var reviewerProposals = new List<Proposal>();
                foreach (var p in allProposals)
                {
                    if (p.Status != ProposalStatuses.Draft)
                    {
                        reviewerProposals.Add(p);
                    }
                }
                return Ok(reviewerProposals);
            }

            return BadRequest(new { message = "Invalid user role." });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var proposal = await _proposalRepository.GetByIdAsync(id);
            if (proposal == null)
                return NotFound();

            var role = GetCurrentUserRole();
            var userId = GetCurrentUserId();

            if (role == UserRoles.Submitter && proposal.SubmitterId != userId)
            {
                return Forbid();
            }

            return Ok(proposal);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ProposalCreateRequest request)
        {
            var userId = GetCurrentUserId();
            var user = await _userRepository.GetByIdAsync(userId);

            if (user == null)
                return Unauthorized();

            var proposal = new Proposal
            {
                Title = request.Title,
                Description = request.Description,
                Department = user.Department, // Automatically match submitter's department
                RequestedAmount = request.RequestedAmount,
                Status = ProposalStatuses.Draft, // Start as draft
                SubmitterId = userId,
                SupportingDocumentPath = request.SupportingDocumentPath ?? string.Empty
            };

            await _proposalRepository.AddAsync(proposal);
            await _proposalRepository.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = proposal.Id }, proposal);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] ProposalCreateRequest request)
        {
            var proposal = await _proposalRepository.GetByIdAsync(id);
            if (proposal == null)
                return NotFound();

            if (proposal.SubmitterId != GetCurrentUserId())
                return Forbid();

            if (proposal.Status != ProposalStatuses.Draft)
                return BadRequest(new { message = "Only proposals in Draft state can be edited." });

            proposal.Title = request.Title;
            proposal.Description = request.Description;
            proposal.RequestedAmount = request.RequestedAmount;
            if (request.SupportingDocumentPath != null)
            {
                proposal.SupportingDocumentPath = request.SupportingDocumentPath;
            }
            proposal.UpdatedAt = DateTime.UtcNow;

            await _proposalRepository.SaveChangesAsync();
            return Ok(proposal);
        }

        [HttpPost("{id}/submit")]
        public async Task<IActionResult> Submit(int id)
        {
            var proposal = await _proposalRepository.GetByIdAsync(id);
            if (proposal == null)
                return NotFound();

            if (proposal.SubmitterId != GetCurrentUserId())
                return Forbid();

            if (proposal.Status != ProposalStatuses.Draft)
                return BadRequest(new { message = "Proposal has already been submitted." });

            proposal.Status = ProposalStatuses.Submitted;
            proposal.UpdatedAt = DateTime.UtcNow;
            await _proposalRepository.SaveChangesAsync();

            // Create notification for Admin
            var adminNotification = new Notification
            {
                UserId = 1, // Admin is user ID 1
                Title = "New Proposal Submitted",
                Message = $"Proposal '{proposal.Title}' has been submitted by {proposal.Submitter?.FullName} ({proposal.Department}) and is awaiting reviewer assignment."
            };
            await _notificationRepository.AddAsync(adminNotification);
            await _notificationRepository.SaveChangesAsync();

            // Send Realtime notifications
            await _hubContext.Clients.Group("Role_Admin").SendAsync("ReceiveNotification", new
            {
                id = adminNotification.Id,
                title = adminNotification.Title,
                message = adminNotification.Message,
                createdAt = adminNotification.CreatedAt,
                isRead = false
            });

            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            // Mock Email to Admin
            await _emailService.SendEmailAsync(
                "admin@governance.com",
                $"[Platform Alert] New Proposal Submitted: {proposal.Title}",
                $"Hello Admin,\n\nA new business proposal titled '{proposal.Title}' requesting {proposal.RequestedAmount:C} has been submitted by {proposal.Submitter?.FullName} in the {proposal.Department} department.\n\nPlease log into the Capital Governance platform to assign reviewers.\n\nBest regards,\nCapital Governance Platform System"
            );

            return Ok(proposal);
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("{id}/assign-reviewer")]
        public async Task<IActionResult> AssignReviewer(int id, [FromBody] AssignReviewerRequest request)
        {
            var proposal = await _proposalRepository.GetByIdAsync(id);
            if (proposal == null)
                return NotFound();

            if (proposal.Status != ProposalStatuses.Submitted && proposal.Status != ProposalStatuses.UnderReview)
                return BadRequest(new { message = "Proposal is not in a state for reviewer assignment." });

            var reviewer = await _userRepository.GetByIdAsync(request.ReviewerId);
            if (reviewer == null || reviewer.Role != UserRoles.Reviewer)
                return BadRequest(new { message = "User is not a valid reviewer." });

            // Update status
            proposal.Status = ProposalStatuses.UnderReview;
            proposal.UpdatedAt = DateTime.UtcNow;
            await _proposalRepository.SaveChangesAsync();

            // In-app alert for Reviewer
            var reviewerNotification = new Notification
            {
                UserId = reviewer.Id,
                Title = "Proposal Assigned for Review",
                Message = $"You have been assigned to evaluate the proposal '{proposal.Title}' submitted by the {proposal.Department} department."
            };
            await _notificationRepository.AddAsync(reviewerNotification);
            await _notificationRepository.SaveChangesAsync();

            // Real-time SignalR
            await _hubContext.Clients.Group($"User_{reviewer.Id}").SendAsync("ReceiveNotification", new
            {
                id = reviewerNotification.Id,
                title = reviewerNotification.Title,
                message = reviewerNotification.Message,
                createdAt = reviewerNotification.CreatedAt,
                isRead = false
            });

            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            // Mock Email to Reviewer
            await _emailService.SendEmailAsync(
                reviewer.Email,
                $"[Platform Alert] Assignment: Review Proposal - {proposal.Title}",
                $"Hello {reviewer.FullName},\n\nYou have been assigned to review and score the proposal '{proposal.Title}' (Requested Amount: {proposal.RequestedAmount:C}).\n\nPlease evaluate the project feasibility, strategic alignment, risk index, and projected ROI, then submit your scores.\n\nBest regards,\nCapital Governance System"
            );

            return Ok(new { message = "Reviewer assigned and notified successfully." });
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("{id}/decide")]
        public async Task<IActionResult> Decide(int id, [FromBody] ProposalDecisionRequest request)
        {
            var proposal = await _proposalRepository.GetByIdAsync(id);
            if (proposal == null)
                return NotFound();

            if (proposal.Status != ProposalStatuses.Reviewed && proposal.Status != ProposalStatuses.UnderReview)
                return BadRequest(new { message = "Proposals must be reviewed before final governance decision." });

            if (request.Decision.ToLower() == "approve")
            {
                if (request.ApprovedAmount <= 0)
                    return BadRequest(new { message = "Approved amount must be greater than zero." });

                proposal.Status = ProposalStatuses.Approved;
                proposal.ApprovedAmount = request.ApprovedAmount;
            }
            else if (request.Decision.ToLower() == "reject")
            {
                proposal.Status = ProposalStatuses.Rejected;
                proposal.ApprovedAmount = 0;
            }
            else
            {
                return BadRequest(new { message = "Decision must be either 'approve' or 'reject'." });
            }

            proposal.UpdatedAt = DateTime.UtcNow;
            await _proposalRepository.SaveChangesAsync();

            // Notify submitter
            var submitterNotification = new Notification
            {
                UserId = proposal.SubmitterId,
                Title = $"Proposal Governance Decision: {proposal.Status}",
                Message = $"Your proposal '{proposal.Title}' has been {proposal.Status.ToLower()}. {(proposal.Status == ProposalStatuses.Approved ? $"Approved Amount: {proposal.ApprovedAmount:C}" : "Comments or feedback are available in your portal.")}"
            };
            await _notificationRepository.AddAsync(submitterNotification);
            await _notificationRepository.SaveChangesAsync();

            // SignalR
            await _hubContext.Clients.Group($"User_{proposal.SubmitterId}").SendAsync("ReceiveNotification", new
            {
                id = submitterNotification.Id,
                title = submitterNotification.Title,
                message = submitterNotification.Message,
                createdAt = submitterNotification.CreatedAt,
                isRead = false
            });

            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            // Mock Email to Submitter
            var submitter = await _userRepository.GetByIdAsync(proposal.SubmitterId);
            if (submitter != null)
            {
                await _emailService.SendEmailAsync(
                    submitter.Email,
                    $"[Platform Update] Proposal {proposal.Status}: {proposal.Title}",
                    $"Hello {submitter.FullName},\n\nYour proposal '{proposal.Title}' has been evaluated and the governing committee has decided to: {proposal.Status.ToUpper()}.\n\n{(proposal.Status == ProposalStatuses.Approved ? $"Approved Amount: {proposal.ApprovedAmount:C}\nFunds are now available for administrative allocation." : "Your project was not selected for capital budgeting this cycle.")}\n\nAccess your dashboard to view further details.\n\nBest regards,\nCapital Governance Platform"
                );
            }

            return Ok(proposal);
        }

        [HttpPost("{id}/analyze")]
        public async Task<IActionResult> Analyze(int id)
        {
            var proposal = await _proposalRepository.GetByIdAsync(id);
            if (proposal == null)
                return NotFound();

            var report = await _aiAnalysisService.AnalyzeProposalAsync(proposal.Title, proposal.Description, proposal.RequestedAmount);
            return Ok(report);
        }
    }

    public class ProposalCreateRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal RequestedAmount { get; set; }
        public string? SupportingDocumentPath { get; set; }
    }

    public class AssignReviewerRequest
    {
        public int ReviewerId { get; set; }
    }

    public class ProposalDecisionRequest
    {
        public string Decision { get; set; } = string.Empty; // "approve" or "reject"
        public decimal ApprovedAmount { get; set; }
    }
}
