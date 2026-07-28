using System;
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
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewRepository _reviewRepository;
        private readonly IProposalRepository _proposalRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IEmailService _emailService;
        private readonly IHubContext<NotificationHub> _hubContext;

        public ReviewsController(
            IReviewRepository reviewRepository,
            IProposalRepository proposalRepository,
            IUserRepository userRepository,
            INotificationRepository notificationRepository,
            IEmailService emailService,
            IHubContext<NotificationHub> hubContext)
        {
            _reviewRepository = reviewRepository;
            _proposalRepository = proposalRepository;
            _userRepository = userRepository;
            _notificationRepository = notificationRepository;
            _emailService = emailService;
            _hubContext = hubContext;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null ? int.Parse(claim.Value) : 0;
        }

        [Authorize(Roles = UserRoles.Reviewer)]
        [HttpPost]
        public async Task<IActionResult> SubmitReview([FromBody] ReviewSubmitRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var proposal = await _proposalRepository.GetByIdAsync(request.ProposalId);
            if (proposal == null)
                return NotFound(new { message = "Proposal not found." });

            if (proposal.Status != ProposalStatuses.UnderReview && proposal.Status != ProposalStatuses.Submitted)
                return BadRequest(new { message = "Proposal is not open for reviews." });

            var reviewerId = GetCurrentUserId();
            var reviewer = await _userRepository.GetByIdAsync(reviewerId);

            var review = new Review
            {
                ProposalId = request.ProposalId,
                ReviewerId = reviewerId,
                FeasibilityScore = request.FeasibilityScore,
                StrategicScore = request.StrategicScore,
                RiskScore = request.RiskScore,
                RoiScore = request.RoiScore,
                Comment = request.Comment,
                SubmittedAt = DateTime.UtcNow
            };

            await _reviewRepository.AddAsync(review);

            // Update proposal state to Reviewed
            proposal.Status = ProposalStatuses.Reviewed;
            proposal.UpdatedAt = DateTime.UtcNow;
            await _proposalRepository.SaveChangesAsync();

            // Create notification for Admin
            var adminNotification = new Notification
            {
                UserId = 1, // Admin is user ID 1
                Title = "Proposal Review Submitted",
                Message = $"Reviewer {reviewer?.FullName} has submitted scores for proposal '{proposal.Title}'. Status is now Reviewed."
            };
            await _notificationRepository.AddAsync(adminNotification);
            await _notificationRepository.SaveChangesAsync();

            // Notify Admin via SignalR
            await _hubContext.Clients.Group("Role_Admin").SendAsync("ReceiveNotification", new
            {
                id = adminNotification.Id,
                title = adminNotification.Title,
                message = adminNotification.Message,
                createdAt = adminNotification.CreatedAt,
                isRead = false
            });

            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            // Mock email to Admin
            await _emailService.SendEmailAsync(
                "admin@governance.com",
                $"[Platform Alert] Review Submitted: {proposal.Title}",
                $"Hello Admin,\n\nReviewer {reviewer?.FullName} has evaluated proposal '{proposal.Title}' and submitted scoring.\n\nEvaluation Metrics:\n- Feasibility Score: {review.FeasibilityScore}/10\n- Strategic Score: {review.StrategicScore}/10\n- Risk Rating: {review.RiskScore}/10\n- ROI Expectation: {review.RoiScore}/10\n\nPlease log in to review the feedback and make a governance decision (approve/reject).\n\nBest regards,\nCapital Governance Platform System"
            );

            return Ok(review);
        }

        [HttpGet("proposal/{proposalId}")]
        public async Task<IActionResult> GetByProposal(int proposalId)
        {
            var reviews = await _reviewRepository.GetByProposalIdAsync(proposalId);
            return Ok(reviews);
        }
    }

    public class ReviewSubmitRequest
    {
        public int ProposalId { get; set; }
        public int FeasibilityScore { get; set; }
        public int StrategicScore { get; set; }
        public int RiskScore { get; set; }
        public int RoiScore { get; set; }
        public string Comment { get; set; } = string.Empty;
    }
}
