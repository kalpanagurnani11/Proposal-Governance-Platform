using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ProposalGovernance.Api.Hubs;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Repositories;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DiscussionsController : ControllerBase
    {
        private readonly IDiscussionRepository _discussionRepository;
        private readonly IProposalRepository _proposalRepository;
        private readonly IUserRepository _userRepository;
        private readonly IHubContext<NotificationHub> _hubContext;

        public DiscussionsController(
            IDiscussionRepository discussionRepository,
            IProposalRepository proposalRepository,
            IUserRepository userRepository,
            IHubContext<NotificationHub> hubContext)
        {
            _discussionRepository = discussionRepository;
            _proposalRepository = proposalRepository;
            _userRepository = userRepository;
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

        [HttpPost("start")]
        public async Task<IActionResult> StartDiscussion([FromBody] StartDiscussionRequest request)
        {
            var role = GetCurrentUserRole();
            if (role != UserRoles.Investor)
                return Forbid();

            var proposal = await _proposalRepository.GetByIdAsync(request.ProposalId);
            if (proposal == null || proposal.Status == ProposalStatuses.Draft)
                return NotFound(new { message = "Proposal not found." });

            var investorId = GetCurrentUserId();
            var discussion = await _discussionRepository.GetOrCreateDiscussionAsync(request.ProposalId, investorId, proposal.SubmitterId);

            return Ok(new
            {
                discussion.Id,
                discussion.ProposalId,
                proposalTitle = proposal.Title,
                startupName = proposal.StartupName,
                discussion.InvestorId,
                discussion.SubmitterId,
                discussion.CreatedAt,
                discussion.UpdatedAt,
                discussion.LastMessageAt
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetMyDiscussions()
        {
            var userId = GetCurrentUserId();
            var discussions = await _discussionRepository.GetDiscussionsByUserIdAsync(userId);
            var results = new List<object>();

            foreach (var d in discussions)
            {
                var otherUser = userId == d.InvestorId ? d.Submitter : d.Investor;
                results.Add(new
                {
                    d.Id,
                    d.ProposalId,
                    ProposalTitle = d.Proposal?.Title ?? "Unknown Project",
                    StartupName = d.Proposal?.StartupName ?? "Unknown Startup",
                    d.InvestorId,
                    d.SubmitterId,
                    d.CreatedAt,
                    d.UpdatedAt,
                    d.LastMessageAt,
                    OtherUser = new
                    {
                        otherUser?.Id,
                        otherUser?.FullName,
                        otherUser?.Role,
                        otherUser?.Email
                    }
                });
            }

            return Ok(results);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDiscussionDetails(int id)
        {
            var d = await _discussionRepository.GetDiscussionByIdAsync(id);
            if (d == null)
                return NotFound(new { message = "Discussion room not found." });

            var userId = GetCurrentUserId();
            if (d.InvestorId != userId && d.SubmitterId != userId)
                return Forbid();

            var messages = await _discussionRepository.GetMessagesByDiscussionIdAsync(id);
            var otherUser = userId == d.InvestorId ? d.Submitter : d.Investor;

            return Ok(new
            {
                d.Id,
                d.ProposalId,
                ProposalTitle = d.Proposal?.Title ?? "Unknown Project",
                StartupName = d.Proposal?.StartupName ?? "Unknown Startup",
                d.InvestorId,
                d.SubmitterId,
                d.CreatedAt,
                d.UpdatedAt,
                d.LastMessageAt,
                OtherUser = new
                {
                    otherUser?.Id,
                    otherUser?.FullName,
                    otherUser?.Role,
                    otherUser?.Email
                },
                messages = messages.Select(m => new
                {
                    m.Id,
                    m.DiscussionId,
                    m.SenderId,
                    SenderName = m.Sender?.FullName ?? "User",
                    m.Content,
                    m.MessageType,
                    m.FileUrl,
                    m.ProposedTime,
                    m.MeetingLink,
                    m.MeetingStatus,
                    m.CreatedAt
                }).ToList()
            });
        }

        [HttpPost("{id}/messages")]
        public async Task<IActionResult> SendMessage(int id, [FromBody] SendMessageRequest request)
        {
            var d = await _discussionRepository.GetDiscussionByIdAsync(id);
            if (d == null)
                return NotFound(new { message = "Discussion room not found." });

            var userId = GetCurrentUserId();
            if (d.InvestorId != userId && d.SubmitterId != userId)
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { message = "Message content cannot be empty." });

            var msgType = string.IsNullOrWhiteSpace(request.MessageType) ? "text" : request.MessageType.ToLower();
            if (msgType != "text" && msgType != "question" && msgType != "file")
                return BadRequest(new { message = "Invalid message type." });

            var message = new DiscussionMessage
            {
                DiscussionId = id,
                SenderId = userId,
                Content = request.Content,
                MessageType = msgType,
                FileUrl = request.FileUrl,
                CreatedAt = DateTime.UtcNow
            };

            await _discussionRepository.AddMessageAsync(message);
            await _discussionRepository.SaveChangesAsync();

            var sender = await _userRepository.GetByIdAsync(userId);
            var response = new
            {
                message.Id,
                message.DiscussionId,
                message.SenderId,
                SenderName = sender?.FullName ?? "User",
                message.Content,
                message.MessageType,
                message.FileUrl,
                message.ProposedTime,
                message.MeetingLink,
                message.MeetingStatus,
                message.CreatedAt
            };

            // Broadcast real-time message via SignalR
            await _hubContext.Clients.Group($"Discussion_{id}").SendAsync("ReceiveDiscussionMessage", response);

            return Ok(response);
        }

        [HttpPost("{id}/meeting")]
        public async Task<IActionResult> ProposeMeeting(int id, [FromBody] ProposeMeetingRequest request)
        {
            var d = await _discussionRepository.GetDiscussionByIdAsync(id);
            if (d == null)
                return NotFound(new { message = "Discussion room not found." });

            var userId = GetCurrentUserId();
            if (d.InvestorId != userId && d.SubmitterId != userId)
                return Forbid();

            if (!request.ProposedTime.HasValue)
                return BadRequest(new { message = "Meeting proposed time is required." });

            if (string.IsNullOrWhiteSpace(request.MeetingLink))
                return BadRequest(new { message = "Meeting link is required." });

            var message = new DiscussionMessage
            {
                DiscussionId = id,
                SenderId = userId,
                Content = request.Notes ?? "Proposed a virtual meeting.",
                MessageType = "meeting_request",
                ProposedTime = request.ProposedTime.Value,
                MeetingLink = request.MeetingLink,
                MeetingStatus = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            await _discussionRepository.AddMessageAsync(message);
            await _discussionRepository.SaveChangesAsync();

            var sender = await _userRepository.GetByIdAsync(userId);
            var response = new
            {
                message.Id,
                message.DiscussionId,
                message.SenderId,
                SenderName = sender?.FullName ?? "User",
                message.Content,
                message.MessageType,
                message.FileUrl,
                message.ProposedTime,
                message.MeetingLink,
                message.MeetingStatus,
                message.CreatedAt
            };

            // Broadcast real-time message via SignalR
            await _hubContext.Clients.Group($"Discussion_{id}").SendAsync("ReceiveDiscussionMessage", response);

            return Ok(response);
        }

        [HttpPut("{discussionId}/meeting/{msgId}/respond")]
        public async Task<IActionResult> RespondMeeting(int discussionId, int msgId, [FromBody] RespondMeetingRequest request)
        {
            var d = await _discussionRepository.GetDiscussionByIdAsync(discussionId);
            if (d == null)
                return NotFound(new { message = "Discussion room not found." });

            var userId = GetCurrentUserId();
            if (d.InvestorId != userId && d.SubmitterId != userId)
                return Forbid();

            var messages = await _discussionRepository.GetMessagesByDiscussionIdAsync(discussionId);
            var message = messages.FirstOrDefault(m => m.Id == msgId);

            if (message == null || message.MessageType != "meeting_request")
                return NotFound(new { message = "Meeting proposal not found." });

            if (message.SenderId == userId)
                return BadRequest(new { message = "You cannot respond to your own meeting proposal." });

            var status = request.Response?.ToLower();
            if (status != "accepted" && status != "declined")
                return BadRequest(new { message = "Response must be 'accepted' or 'declined'." });

            message.MeetingStatus = status == "accepted" ? "Accepted" : "Declined";
            await _discussionRepository.SaveChangesAsync();

            var response = new
            {
                message.Id,
                message.DiscussionId,
                message.SenderId,
                SenderName = message.Sender?.FullName ?? "User",
                message.Content,
                message.MessageType,
                message.FileUrl,
                message.ProposedTime,
                message.MeetingLink,
                message.MeetingStatus,
                message.CreatedAt
            };

            // Broadcast real-time update via SignalR so the state updates dynamically
            await _hubContext.Clients.Group($"Discussion_{discussionId}").SendAsync("ReceiveDiscussionMessage", response);

            return Ok(response);
        }
    }

    public class StartDiscussionRequest
    {
        public int ProposalId { get; set; }
    }

    public class SendMessageRequest
    {
        public string Content { get; set; } = string.Empty;
        public string MessageType { get; set; } = "text";
        public string? FileUrl { get; set; }
    }

    public class ProposeMeetingRequest
    {
        public DateTime? ProposedTime { get; set; }
        public string MeetingLink { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class RespondMeetingRequest
    {
        public string Response { get; set; } = string.Empty; // "accepted" or "declined"
    }
}
