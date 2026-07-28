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
    public class SocialController : ControllerBase
    {
        private readonly ISocialRepository _socialRepository;
        private readonly IProposalRepository _proposalRepository;
        private readonly IHubContext<NotificationHub> _hubContext;

        public SocialController(
            ISocialRepository socialRepository,
            IProposalRepository proposalRepository,
            IHubContext<NotificationHub> hubContext)
        {
            _socialRepository = socialRepository;
            _proposalRepository = proposalRepository;
            _hubContext = hubContext;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null ? int.Parse(claim.Value) : 0;
        }

        /// <summary>
        /// Get the community feed containing all non-draft proposals with social metrics
        /// and a list of recent platform investment activity updates.
        /// </summary>
        [HttpGet("feed")]
        public async Task<IActionResult> GetCommunityFeed()
        {
            var userId = GetCurrentUserId();
            var allProposals = await _proposalRepository.GetAllAsync();
            
            var feedItems = new List<object>();
            foreach (var p in allProposals)
            {
                if (p.Status == ProposalStatuses.Draft) continue;

                var likes = await _socialRepository.GetLikesByProposalIdAsync(p.Id);
                var comments = await _socialRepository.GetCommentsByProposalIdAsync(p.Id);
                var hasLiked = likes.Any(l => l.UserId == userId);

                feedItems.Add(new
                {
                    p.Id,
                    p.Title,
                    p.Description,
                    p.Department,
                    p.RequestedAmount,
                    p.ApprovedAmount,
                    p.Status,
                    p.CreatedAt,
                    p.UpdatedAt,
                    p.StartupName,
                    p.ProblemStatement,
                    p.ProposedStatement,
                    p.EquityOffered,
                    p.BusinessModel,
                    p.TeamDetails,
                    p.DemoVideoUrl,
                    Submitter = new
                    {
                        p.SubmitterId,
                        FullName = p.Submitter?.FullName ?? "Unknown User",
                        Role = p.Submitter?.Role ?? "Submitter",
                        Department = p.Submitter?.Department ?? "",
                        PatentVerificationStatus = p.Submitter?.PatentVerificationStatus ?? "Unverified",
                        PatentId = p.Submitter?.PatentId ?? ""
                    },
                    likeCount = likes.Count(),
                    hasLiked,
                    commentCount = comments.Count()
                });
            }

            // Order feed items by CreatedAt descending (newest posts first)
            var sortedFeed = feedItems
                .OrderByDescending(f => ((dynamic)f).CreatedAt)
                .ToList();

            // Fetch recent investor activity
            var recentInvestments = await _socialRepository.GetRecentInvestmentsAsync(5);
            var activityFeed = recentInvestments.Select(i => new
            {
                i.Id,
                InvestorName = i.Investor?.FullName ?? "Investor",
                ProposalTitle = i.Proposal?.Title ?? "Project",
                ProposalId = i.ProposalId,
                i.CommittedAmount,
                i.InvestedAt
            });

            return Ok(new
            {
                posts = sortedFeed,
                activities = activityFeed
            });
        }

        /// <summary>
        /// Get social stats (like count, current user liked status, and comments list) for a proposal.
        /// </summary>
        [HttpGet("proposals/{proposalId}/social")]
        public async Task<IActionResult> GetProposalSocial(int proposalId)
        {
            var proposal = await _proposalRepository.GetByIdAsync(proposalId);
            if (proposal == null)
                return NotFound(new { message = "Proposal not found." });

            var userId = GetCurrentUserId();
            var likes = await _socialRepository.GetLikesByProposalIdAsync(proposalId);
            var comments = await _socialRepository.GetCommentsByProposalIdAsync(proposalId);
            var hasLiked = await _socialRepository.HasUserLikedAsync(proposalId, userId);

            return Ok(new
            {
                proposalId,
                likeCount = likes.Count(),
                hasLiked,
                likes = likes.Select(l => new
                {
                    l.UserId,
                    UserName = l.User?.FullName ?? "User",
                    l.LikedAt
                }),
                comments = comments.Select(c => new
                {
                    c.Id,
                    c.UserId,
                    UserName = c.User?.FullName ?? "User",
                    UserRole = c.User?.Role ?? "User",
                    c.Content,
                    c.CreatedAt
                })
            });
        }

        /// <summary>
        /// Toggle like status for the current user on a proposal.
        /// </summary>
        [HttpPost("proposals/{proposalId}/like")]
        public async Task<IActionResult> ToggleLike(int proposalId)
        {
            var proposal = await _proposalRepository.GetByIdAsync(proposalId);
            if (proposal == null)
                return NotFound(new { message = "Proposal not found." });

            var userId = GetCurrentUserId();
            var hasLiked = await _socialRepository.HasUserLikedAsync(proposalId, userId);

            if (hasLiked)
            {
                await _socialRepository.RemoveLikeAsync(proposalId, userId);
            }
            else
            {
                var like = new ProposalLike
                {
                    ProposalId = proposalId,
                    UserId = userId,
                    LikedAt = DateTime.UtcNow
                };
                await _socialRepository.AddLikeAsync(like);
            }

            await _socialRepository.SaveChangesAsync();

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            var updatedLikes = await _socialRepository.GetLikesByProposalIdAsync(proposalId);
            return Ok(new
            {
                liked = !hasLiked,
                likeCount = updatedLikes.Count()
            });
        }

        /// <summary>
        /// Post a comment to a proposal.
        /// </summary>
        [HttpPost("proposals/{proposalId}/comment")]
        public async Task<IActionResult> AddComment(int proposalId, [FromBody] CommentRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { message = "Comment content cannot be empty." });

            var proposal = await _proposalRepository.GetByIdAsync(proposalId);
            if (proposal == null)
                return NotFound(new { message = "Proposal not found." });

            var userId = GetCurrentUserId();
            var comment = new ProposalComment
            {
                ProposalId = proposalId,
                UserId = userId,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow
            };

            await _socialRepository.AddCommentAsync(comment);
            await _socialRepository.SaveChangesAsync();

            // Fetch comment back with user navigation populated
            var dbComment = await _socialRepository.GetCommentByIdAsync(comment.Id);

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(new
            {
                dbComment?.Id,
                dbComment?.UserId,
                UserName = dbComment?.User?.FullName ?? "User",
                UserRole = dbComment?.User?.Role ?? "User",
                dbComment?.Content,
                dbComment?.CreatedAt
            });
        }

        /// <summary>
        /// Delete a comment.
        /// </summary>
        [HttpDelete("comments/{commentId}")]
        public async Task<IActionResult> DeleteComment(int commentId)
        {
            var comment = await _socialRepository.GetCommentByIdAsync(commentId);
            if (comment == null)
                return NotFound(new { message = "Comment not found." });

            var userId = GetCurrentUserId();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            // Allow if comment creator OR admin
            if (comment.UserId != userId && role != UserRoles.Admin)
                return Forbid();

            await _socialRepository.DeleteCommentAsync(commentId);
            await _socialRepository.SaveChangesAsync();

            // Broadcast real-time update
            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(new { message = "Comment deleted successfully." });
        }
    }

    public class CommentRequest
    {
        public string Content { get; set; } = string.Empty;
    }
}
