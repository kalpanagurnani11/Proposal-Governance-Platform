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
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ConsultationController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly ISubscriptionService _subscriptionService;
        private readonly INotificationRepository _notificationRepository;
        private readonly IHubContext<NotificationHub> _hubContext;

        public ConsultationController(
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

        private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        // POST /api/consultations/request
        [HttpPost("request")]
        public async Task<IActionResult> RequestConsultation([FromBody] RequestConsultationInput input)
        {
            var userId = GetUserId();

            // Validate premium subscription
            if (!await _subscriptionService.HasPremiumAsync(userId))
            {
                return StatusCode(403, new { message = "Only Premium members can request reviewer consultations." });
            }

            // Check if consultations are remaining
            if (!await _subscriptionService.HasConsultationsRemainingAsync(userId))
            {
                return BadRequest(new { message = "You have exhausted your reviewer consultation limit for the current cycle." });
            }

            if (string.IsNullOrWhiteSpace(input.Subject) || string.IsNullOrWhiteSpace(input.Description) || string.IsNullOrWhiteSpace(input.ConsultationType))
            {
                return BadRequest(new { message = "Subject, Description, and ConsultationType are required." });
            }

            // Optional validation for Reviewer
            User? reviewer = null;
            if (input.ReviewerId.HasValue)
            {
                reviewer = await _context.Users.FindAsync(input.ReviewerId.Value);
                if (reviewer == null || reviewer.Role != UserRoles.Reviewer)
                {
                    return BadRequest(new { message = "Selected reviewer is invalid." });
                }
            }

            // Optional validation for Startup proposal
            if (input.StartupId.HasValue)
            {
                var startup = await _context.Proposals.FindAsync(input.StartupId.Value);
                if (startup == null || startup.SubmitterId != userId)
                {
                    return BadRequest(new { message = "Selected proposal is invalid." });
                }
            }

            var request = new ConsultationRequest
            {
                UserId = userId,
                ReviewerId = input.ReviewerId,
                StartupId = input.StartupId,
                ConsultationType = input.ConsultationType,
                Subject = input.Subject,
                Description = input.Description,
                Status = "Pending",
                RequestedAt = DateTime.UtcNow
            };

            await _context.ConsultationRequests.AddAsync(request);
            await _context.SaveChangesAsync();

            // Send notification to reviewer if pre-selected, otherwise notify all reviewers that a request is pending
            if (reviewer != null)
            {
                var notification = new Notification
                {
                    UserId = reviewer.Id,
                    Title = "New Consultation Request Assigned 📞",
                    Message = $"You have been requested for a consultation on: '{input.Subject}' by Premium member.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                await _notificationRepository.AddAsync(notification);
                await _notificationRepository.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("NotificationReceived", reviewer.Id);
            }
            else
            {
                // Notify all reviewers
                var reviewers = await _context.Users.Where(u => u.Role == UserRoles.Reviewer).ToListAsync();
                foreach (var rev in reviewers)
                {
                    var notification = new Notification
                    {
                        UserId = rev.Id,
                        Title = "Pending Consultation Request Available 📞",
                        Message = $"A new consultation request '{input.Subject}' is waiting in the queue.",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _notificationRepository.AddAsync(notification);
                }
                await _notificationRepository.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("DashboardUpdated");
            }

            return Ok(new { message = "Consultation request submitted successfully.", consultationId = request.Id });
        }

        // GET /api/consultations/my
        [HttpGet("my")]
        public async Task<IActionResult> GetMyConsultations()
        {
            var userId = GetUserId();
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            if (userRole == UserRoles.Investor && !await _subscriptionService.HasPremiumAsync(userId))
            {
                return StatusCode(403, new { message = "Expert Consultations are available exclusively to Premium Investor accounts." });
            }
            var requests = await _context.ConsultationRequests
                .Include(c => c.Reviewer)
                .Include(c => c.Startup)
                .Where(c => c.UserId == userId)
                .OrderByDescending(c => c.RequestedAt)
                .Select(c => new
                {
                    c.Id,
                    c.ConsultationType,
                    c.Subject,
                    c.Description,
                    c.Status,
                    c.RequestedAt,
                    c.AcceptedAt,
                    c.CompletedAt,
                    c.Rating,
                    c.Feedback,
                    ReviewerName = c.Reviewer != null ? c.Reviewer.FullName : "Unassigned",
                    StartupTitle = c.Startup != null ? c.Startup.Title : "N/A"
                })
                .ToListAsync();

            var remaining = await _subscriptionService.GetRemainingConsultationsAsync(userId);

            return Ok(new { consultations = requests, remainingConsultations = remaining });
        }

        // POST /api/consultations/{id}/cancel
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> CancelConsultation(int id)
        {
            var userId = GetUserId();
            var request = await _context.ConsultationRequests.FindAsync(id);

            if (request == null) return NotFound(new { message = "Consultation request not found." });
            if (request.UserId != userId) return Forbid();

            if (request.Status == "Completed" || request.Status == "Cancelled" || request.Status == "Rejected")
            {
                return BadRequest(new { message = $"Cannot cancel consultation with status: {request.Status}." });
            }

            var oldStatus = request.Status;
            request.Status = "Cancelled";
            await _context.SaveChangesAsync();

            // Notify reviewer if assigned
            if (request.ReviewerId.HasValue)
            {
                var notification = new Notification
                {
                    UserId = request.ReviewerId.Value,
                    Title = "Consultation Cancelled ❌",
                    Message = $"The consultation request '{request.Subject}' was cancelled by the user.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                await _notificationRepository.AddAsync(notification);
                await _notificationRepository.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("NotificationReceived", request.ReviewerId.Value);
            }

            return Ok(new { message = "Consultation request cancelled successfully." });
        }

        // POST /api/consultations/{id}/rate
        [HttpPost("{id}/rate")]
        public async Task<IActionResult> RateConsultation(int id, [FromBody] RateConsultationInput input)
        {
            var userId = GetUserId();
            var request = await _context.ConsultationRequests.FindAsync(id);

            if (request == null) return NotFound(new { message = "Consultation request not found." });
            if (request.UserId != userId) return Forbid();

            if (request.Status != "Completed")
            {
                return BadRequest(new { message = "You can only rate completed consultations." });
            }

            if (input.Rating < 1 || input.Rating > 5)
            {
                return BadRequest(new { message = "Rating must be between 1 and 5." });
            }

            request.Rating = input.Rating;
            request.Feedback = input.Feedback;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Thank you for your feedback!" });
        }

        // GET /api/consultations/{id}/messages
        [HttpGet("{id}/messages")]
        public async Task<IActionResult> GetMessages(int id)
        {
            var userId = GetUserId();
            var request = await _context.ConsultationRequests.FindAsync(id);

            if (request == null) return NotFound(new { message = "Consultation not found." });
            if (request.UserId != userId && request.ReviewerId != userId)
            {
                // Admin can view too
                var user = await _context.Users.FindAsync(userId);
                if (user?.Role != UserRoles.Admin)
                {
                    return Forbid();
                }
            }

            var messages = await _context.ConsultationMessages
                .Include(m => m.Sender)
                .Where(m => m.ConsultationId == id)
                .OrderBy(m => m.SentAt)
                .Select(m => new
                {
                    m.Id,
                    m.ConsultationId,
                    m.SenderId,
                    SenderName = m.Sender != null ? m.Sender.FullName : "User",
                    SenderRole = m.Sender != null ? m.Sender.Role : "",
                    m.Content,
                    m.FileUrl,
                    m.FileType,
                    m.FileName,
                    m.IsRead,
                    m.SentAt
                })
                .ToListAsync();

            // Mark other sender's messages as read
            var unread = await _context.ConsultationMessages
                .Where(m => m.ConsultationId == id && m.SenderId != userId && !m.IsRead)
                .ToListAsync();

            if (unread.Any())
            {
                foreach (var msg in unread)
                {
                    msg.IsRead = true;
                }
                await _context.SaveChangesAsync();
            }

            return Ok(messages);
        }

        // POST /api/consultations/{id}/messages
        [HttpPost("{id}/messages")]
        public async Task<IActionResult> SendMessage(int id, [FromBody] ConsultationMessageInput input)
        {
            var userId = GetUserId();
            var request = await _context.ConsultationRequests.FindAsync(id);

            if (request == null) return NotFound(new { message = "Consultation not found." });
            if (request.UserId != userId && request.ReviewerId != userId)
            {
                return Forbid();
            }

            if (request.Status == "Cancelled" || request.Status == "Rejected")
            {
                return BadRequest(new { message = "Cannot send messages in a cancelled or rejected consultation." });
            }

            if (string.IsNullOrWhiteSpace(input.Content) && string.IsNullOrWhiteSpace(input.FileUrl))
            {
                return BadRequest(new { message = "Message content or file is required." });
            }

            var message = new ConsultationMessage
            {
                ConsultationId = id,
                SenderId = userId,
                Content = input.Content,
                FileUrl = input.FileUrl,
                FileType = input.FileType,
                FileName = input.FileName,
                SentAt = DateTime.UtcNow,
                IsRead = false
            };

            await _context.ConsultationMessages.AddAsync(message);
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FindAsync(userId);
            var response = new
            {
                message.Id,
                message.ConsultationId,
                message.SenderId,
                SenderName = sender?.FullName ?? "User",
                SenderRole = sender?.Role ?? "",
                message.Content,
                message.FileUrl,
                message.FileType,
                message.FileName,
                message.IsRead,
                message.SentAt
            };

            // Notify other party
            int recipientId = userId == request.UserId ? (request.ReviewerId ?? 0) : request.UserId;
            if (recipientId > 0)
            {
                var notification = new Notification
                {
                    UserId = recipientId,
                    Title = "New Consultation Message ✉️",
                    Message = $"You received a message in the consultation '{request.Subject}'",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                await _notificationRepository.AddAsync(notification);
                await _notificationRepository.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("NotificationReceived", recipientId);
            }

            // SignalR live update
            await _hubContext.Clients.All.SendAsync("ReceiveConsultationMessage", response);

            return Ok(response);
        }
    }

    public class RequestConsultationInput
    {
        public string ConsultationType { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int? ReviewerId { get; set; }
        public int? StartupId { get; set; }
    }

    public class RateConsultationInput
    {
        public int Rating { get; set; }
        public string? Feedback { get; set; }
    }

    public class ConsultationMessageInput
    {
        public string? Content { get; set; }
        public string? FileUrl { get; set; }
        public string? FileType { get; set; }
        public string? FileName { get; set; }
    }
}
