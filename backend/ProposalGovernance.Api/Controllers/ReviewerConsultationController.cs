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
using ProposalGovernance.Api.Services;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize(Roles = UserRoles.Reviewer)]
    [ApiController]
    [Route("api/reviewer/consultations")]
    public class ReviewerConsultationController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly ISubscriptionService _subscriptionService;
        private readonly INotificationRepository _notificationRepository;
        private readonly IHubContext<NotificationHub> _hubContext;

        public ReviewerConsultationController(
            GovernanceDbContext context,
            ISubscriptionService subscriptionService,
            INotificationRepository notificationRepository,
            IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _subscriptionService = subscriptionService;
            _notificationRepository = notificationRepository;
            _hubContext = hubContext;
        }

        private int GetReviewerId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        // GET /api/reviewer/consultations
        [HttpGet]
        public async Task<IActionResult> GetReviewerConsultations()
        {
            var reviewerId = GetReviewerId();

            // Return consultations assigned to this reviewer OR pending consultations that are unassigned
            var consultations = await _context.ConsultationRequests
                .Include(c => c.User)
                .Include(c => c.Startup)
                .Where(c => c.ReviewerId == reviewerId || (c.ReviewerId == null && c.Status == "Pending"))
                .OrderByDescending(c => c.RequestedAt)
                .Select(c => new
                {
                    c.Id,
                    c.UserId,
                    UserName = c.User != null ? c.User.FullName : "Unknown",
                    c.ConsultationType,
                    c.Subject,
                    c.Description,
                    c.Status,
                    c.RequestedAt,
                    c.AcceptedAt,
                    c.CompletedAt,
                    c.Rating,
                    c.Feedback,
                    StartupTitle = c.Startup != null ? c.Startup.Title : "N/A",
                    IsAssignedToMe = c.ReviewerId == reviewerId
                })
                .ToListAsync();

            return Ok(consultations);
        }

        // POST /api/reviewer/consultations/{id}/accept
        [HttpPost("{id}/accept")]
        public async Task<IActionResult> AcceptConsultation(int id)
        {
            var reviewerId = GetReviewerId();
            var request = await _context.ConsultationRequests.FindAsync(id);

            if (request == null) return NotFound(new { message = "Consultation request not found." });

            if (request.ReviewerId != null && request.ReviewerId != reviewerId)
            {
                return BadRequest(new { message = "This consultation is already assigned to another reviewer." });
            }

            if (request.Status != "Pending")
            {
                return BadRequest(new { message = $"Cannot accept a consultation with status: {request.Status}." });
            }

            request.ReviewerId = reviewerId;
            request.Status = "Accepted";
            request.AcceptedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Notify user
            var notification = new Notification
            {
                UserId = request.UserId,
                Title = "Consultation Request Accepted! 📞",
                Message = $"Your consultation request '{request.Subject}' has been accepted. You can now chat in the portal.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("NotificationReceived", request.UserId);
            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(new { message = "Consultation request accepted successfully." });
        }

        // POST /api/reviewer/consultations/{id}/reject
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectConsultation(int id)
        {
            var reviewerId = GetReviewerId();
            var request = await _context.ConsultationRequests.FindAsync(id);

            if (request == null) return NotFound(new { message = "Consultation request not found." });

            if (request.ReviewerId.HasValue && request.ReviewerId.Value != reviewerId)
            {
                return Forbid();
            }

            if (request.Status != "Pending")
            {
                return BadRequest(new { message = "You can only reject pending consultations." });
            }

            request.Status = "Rejected";
            await _context.SaveChangesAsync();

            // Notify user
            var notification = new Notification
            {
                UserId = request.UserId,
                Title = "Consultation Request Declined ❌",
                Message = $"Your consultation request '{request.Subject}' was declined by the reviewer.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("NotificationReceived", request.UserId);
            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(new { message = "Consultation request rejected." });
        }

        // POST /api/reviewer/consultations/{id}/complete
        [HttpPost("{id}/complete")]
        public async Task<IActionResult> CompleteConsultation(int id)
        {
            var reviewerId = GetReviewerId();
            var request = await _context.ConsultationRequests.FindAsync(id);

            if (request == null) return NotFound(new { message = "Consultation request not found." });

            if (request.ReviewerId != reviewerId)
            {
                return Forbid();
            }

            if (request.Status != "Accepted" && request.Status != "InProgress")
            {
                return BadRequest(new { message = $"Cannot complete a consultation with status: {request.Status}." });
            }

            // Deduct consultation from user's quota
            var deducted = await _subscriptionService.DeductConsultationAsync(request.UserId);
            if (!deducted)
            {
                // If user doesn't have active subscription or quota, we'll still mark complete but issue a warning log
                Console.WriteLine($"[Consultation] Warning: Deducting consultation failed for user {request.UserId} during completion of request {id}.");
            }

            request.Status = "Completed";
            request.CompletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Notify user
            var notification = new Notification
            {
                UserId = request.UserId,
                Title = "Consultation Completed 🏆",
                Message = $"Your consultation request '{request.Subject}' has been marked as Completed. Please provide your feedback.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("NotificationReceived", request.UserId);
            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(new { message = "Consultation marked as completed and quota deducted successfully." });
        }
    }
}
