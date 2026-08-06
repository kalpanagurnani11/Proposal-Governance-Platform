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
    public class MarketplaceController : ControllerBase
    {
        private readonly IMarketplaceRepository _marketplaceRepository;
        private readonly ISocialRepository _socialRepository;
        private readonly IProposalRepository _proposalRepository;
        private readonly IHubContext<NotificationHub> _hubContext;

        public MarketplaceController(
            IMarketplaceRepository marketplaceRepository,
            ISocialRepository socialRepository,
            IProposalRepository proposalRepository,
            IHubContext<NotificationHub> hubContext)
        {
            _marketplaceRepository = marketplaceRepository;
            _socialRepository = socialRepository;
            _proposalRepository = proposalRepository;
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
        public async Task<IActionResult> Browse(
            [FromQuery] string? industry = null,
            [FromQuery] string? category = null,
            [FromQuery] decimal? minFunding = null,
            [FromQuery] decimal? maxFunding = null,
            [FromQuery] decimal? minEquity = null,
            [FromQuery] decimal? maxEquity = null,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? search = null,
            [FromQuery] int? page = null,
            [FromQuery] int? pageSize = null)
        {
            var userId = GetCurrentUserId();
            var proposals = await _marketplaceRepository.GetAllForMarketplaceAsync();
            var items = new List<dynamic>();

            foreach (var p in proposals)
            {
                // Filters
                if (!string.IsNullOrEmpty(industry) && !string.Equals(p.Industry, industry, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!string.IsNullOrEmpty(category) && !string.Equals(p.Category, category, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (minFunding.HasValue && p.RequestedAmount < minFunding.Value)
                    continue;

                if (maxFunding.HasValue && p.RequestedAmount > maxFunding.Value)
                    continue;

                if (minEquity.HasValue && p.EquityOffered < minEquity.Value)
                    continue;

                if (maxEquity.HasValue && p.EquityOffered > maxEquity.Value)
                    continue;

                if (!string.IsNullOrEmpty(search))
                {
                    bool matchTitle = p.Title.Contains(search, StringComparison.OrdinalIgnoreCase);
                    bool matchStartup = p.StartupName.Contains(search, StringComparison.OrdinalIgnoreCase);
                    bool matchProblem = p.ProblemStatement.Contains(search, StringComparison.OrdinalIgnoreCase);
                    if (!matchTitle && !matchStartup && !matchProblem)
                        continue;
                }

                var likes = await _socialRepository.GetLikesByProposalIdAsync(p.Id);
                var comments = await _socialRepository.GetCommentsByProposalIdAsync(p.Id);
                var interestCount = await _marketplaceRepository.GetInterestCountByProposalAsync(p.Id);
                var hasLiked = likes.Any(l => l.UserId == userId);
                var hasInterested = (await _marketplaceRepository.GetInterestByProposalAndInvestorAsync(p.Id, userId)) != null;

                items.Add(new
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
                    p.Industry,
                    p.Category,
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
                    commentCount = comments.Count(),
                    interestCount,
                    hasInterested
                });
            }

            // Sorting
            IEnumerable<dynamic> sorted = items;
            if (string.Equals(sortBy, "popular", StringComparison.OrdinalIgnoreCase))
            {
                sorted = items.OrderByDescending(x => x.interestCount);
            }
            else if (string.Equals(sortBy, "funding", StringComparison.OrdinalIgnoreCase))
            {
                sorted = items.OrderByDescending(x => x.RequestedAmount);
            }
            else if (string.Equals(sortBy, "equity", StringComparison.OrdinalIgnoreCase))
            {
                sorted = items.OrderByDescending(x => x.EquityOffered);
            }
            else // Default to recent
            {
                sorted = items.OrderByDescending(x => x.CreatedAt);
            }

            var sortedList = sorted.ToList();

            if (page.HasValue)
            {
                int currentPage = page.Value <= 0 ? 1 : page.Value;
                int effectivePageSize = (pageSize.HasValue && pageSize.Value > 0) ? pageSize.Value : 10;

                int totalCount = sortedList.Count;
                int totalPages = (int)Math.Ceiling(totalCount / (double)effectivePageSize);
                var pagedItems = sortedList.Skip((currentPage - 1) * effectivePageSize).Take(effectivePageSize).ToList();

                return Ok(new
                {
                    items = pagedItems,
                    currentPage,
                    pageSize = effectivePageSize,
                    totalPages,
                    totalCount,
                    hasNext = currentPage < totalPages,
                    hasPrevious = currentPage > 1
                });
            }

            return Ok(sortedList);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetDetails(int id)
        {
            var p = await _proposalRepository.GetByIdAsync(id);
            if (p == null || p.Status == ProposalStatuses.Draft)
                return NotFound(new { message = "Proposal not found." });

            var userId = GetCurrentUserId();
            var likes = await _socialRepository.GetLikesByProposalIdAsync(p.Id);
            var comments = await _socialRepository.GetCommentsByProposalIdAsync(p.Id);
            var interestCount = await _marketplaceRepository.GetInterestCountByProposalAsync(p.Id);
            var hasLiked = likes.Any(l => l.UserId == userId);
            var hasInterested = (await _marketplaceRepository.GetInterestByProposalAndInvestorAsync(p.Id, userId)) != null;

            return Ok(new
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
                p.Industry,
                p.Category,
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
                commentCount = comments.Count(),
                interestCount,
                hasInterested,
                comments = comments.Select(c => new
                {
                    c.Id,
                    c.UserId,
                    UserName = c.User?.FullName ?? "User",
                    UserRole = c.User?.Role ?? "User",
                    c.Content,
                    c.CreatedAt
                }).ToList()
            });
        }

        [HttpPost("{id}/interest")]
        public async Task<IActionResult> ToggleInterest(int id)
        {
            var role = GetCurrentUserRole();
            if (role != UserRoles.Investor)
                return Forbid();

            var proposal = await _proposalRepository.GetByIdAsync(id);
            if (proposal == null || proposal.Status == ProposalStatuses.Draft)
                return NotFound(new { message = "Proposal not found." });

            var userId = GetCurrentUserId();
            var interest = await _marketplaceRepository.GetInterestByProposalAndInvestorAsync(id, userId);
            bool interested;

            if (interest != null)
            {
                await _marketplaceRepository.RemoveInterestAsync(id, userId);
                interested = false;
            }
            else
            {
                var newInterest = new InvestorInterest
                {
                    ProposalId = id,
                    InvestorId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                await _marketplaceRepository.AddInterestAsync(newInterest);
                interested = true;
            }

            await _marketplaceRepository.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            var updatedCount = await _marketplaceRepository.GetInterestCountByProposalAsync(id);
            return Ok(new
            {
                interested,
                interestCount = updatedCount
            });
        }

        [HttpGet("{id}/interest/count")]
        public async Task<IActionResult> GetInterestCount(int id)
        {
            var proposal = await _proposalRepository.GetByIdAsync(id);
            if (proposal == null || proposal.Status == ProposalStatuses.Draft)
                return NotFound(new { message = "Proposal not found." });

            var count = await _marketplaceRepository.GetInterestCountByProposalAsync(id);
            return Ok(new { count });
        }

        [HttpPost("{id}/feedback")]
        public async Task<IActionResult> SubmitFeedback(int id, [FromBody] FeedbackRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { message = "Feedback content cannot be empty." });

            var proposal = await _proposalRepository.GetByIdAsync(id);
            if (proposal == null || proposal.Status == ProposalStatuses.Draft)
                return NotFound(new { message = "Proposal not found." });

            var userId = GetCurrentUserId();
            var comment = new ProposalComment
            {
                ProposalId = id,
                UserId = userId,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow
            };

            await _socialRepository.AddCommentAsync(comment);
            await _socialRepository.SaveChangesAsync();

            var dbComment = await _socialRepository.GetCommentByIdAsync(comment.Id);
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
    }

    public class FeedbackRequest
    {
        public string Content { get; set; } = string.Empty;
    }
}
