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
    [Authorize(Roles = UserRoles.Investor)]
    [ApiController]
    [Route("api/[controller]")]
    public class InvestorController : ControllerBase
    {
        private readonly IProposalRepository _proposalRepository;
        private readonly ICapitalRepository _capitalRepository;
        private readonly IInvestmentRepository _investmentRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IUserRepository _userRepository;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly Services.ISubscriptionService _subscriptionService;

        public InvestorController(
            IProposalRepository proposalRepository,
            ICapitalRepository capitalRepository,
            IInvestmentRepository investmentRepository,
            INotificationRepository notificationRepository,
            IUserRepository userRepository,
            IHubContext<NotificationHub> hubContext,
            Services.ISubscriptionService subscriptionService)
        {
            _proposalRepository = proposalRepository;
            _capitalRepository = capitalRepository;
            _investmentRepository = investmentRepository;
            _notificationRepository = notificationRepository;
            _userRepository = userRepository;
            _hubContext = hubContext;
            _subscriptionService = subscriptionService;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null ? int.Parse(claim.Value) : 0;
        }

        /// <summary>
        /// Browse all Approved proposals that are open for investment.
        /// </summary>
        [HttpGet("approved-proposals")]
        public async Task<IActionResult> GetApprovedProposals()
        {
            var allProposals = await _proposalRepository.GetAllAsync();
            var approved = new List<object>();

            foreach (var p in allProposals)
            {
                if (p.Status == ProposalStatuses.Approved || p.Status == ProposalStatuses.FundAllocated)
                {
                    // Get existing investments for this proposal
                    var investments = await _investmentRepository.GetByProposalIdAsync(p.Id);
                    decimal totalInvested = 0;
                    foreach (var inv in investments) totalInvested += inv.CommittedAmount;

                    var allocation = await _capitalRepository.GetAllocationByProposalIdAsync(p.Id);

                    approved.Add(new
                    {
                        p.Id,
                        p.Title,
                        p.Description,
                        p.Department,
                        p.RequestedAmount,
                        p.ApprovedAmount,
                        p.Status,
                        SubmitterName = p.Submitter?.FullName ?? "Unknown",
                        p.CreatedAt,
                        p.UpdatedAt,
                        p.StartupName,
                        p.ProblemStatement,
                        p.ProposedStatement,
                        p.EquityOffered,
                        p.BusinessModel,
                        p.TeamDetails,
                        p.DemoVideoUrl,
                        TotalInvested = totalInvested,
                        RemainingToFund = p.ApprovedAmount - totalInvested,
                        IsFullyFunded = totalInvested >= p.ApprovedAmount,
                        InvestorCount = investments.Count(),
                        DisbursedAmount = allocation?.DisbursedAmount ?? 0,
                        RemainingBalance = allocation?.RemainingBalance ?? 0
                    });
                }
            }

            return Ok(approved);
        }

        /// <summary>
        /// Invest in an approved proposal. Multiple investors can contribute.
        /// </summary>
        [HttpPost("invest")]
        public async Task<IActionResult> Invest([FromBody] InvestRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var proposal = await _proposalRepository.GetByIdAsync(request.ProposalId);

            if (proposal == null)
                return NotFound(new { message = "Proposal not found." });

            if (proposal.Status != ProposalStatuses.Approved && proposal.Status != ProposalStatuses.FundAllocated)
                return BadRequest(new { message = "Only approved proposals can receive investment." });

            if (proposal.SubmitterId == userId)
                return BadRequest(new { message = "Founders cannot invest in their own proposals." });

            if (request.Amount <= 0)
                return BadRequest(new { message = "Investment amount must be greater than zero." });

            // Check how much is already invested
            var existingInvestments = await _investmentRepository.GetByProposalIdAsync(proposal.Id);
            decimal totalInvested = 0;
            foreach (var inv in existingInvestments) totalInvested += inv.CommittedAmount;

            decimal remainingToFund = proposal.ApprovedAmount - totalInvested;

            if (remainingToFund <= 0)
                return BadRequest(new { message = "This proposal is already 100% fully funded." });

            if (request.Amount > remainingToFund)
                return BadRequest(new { message = $"Investment exceeds remaining funding gap. Remaining: {remainingToFund:C}, Requested: {request.Amount:C}" });

            // Create the investment record
            var investment = new Investment
            {
                InvestorId = userId,
                ProposalId = proposal.Id,
                CommittedAmount = request.Amount,
                Notes = request.Notes ?? "",
                InvestedAt = DateTime.UtcNow,
                Status = InvestmentStatuses.Active
            };

            await _investmentRepository.AddAsync(investment);
            await _investmentRepository.SaveChangesAsync();

            // Check if proposal is now fully funded → create/update CapitalAllocation
            totalInvested += request.Amount;
            bool fullyFunded = totalInvested >= proposal.ApprovedAmount;

            var allocation = await _capitalRepository.GetAllocationByProposalIdAsync(proposal.Id);

            if (allocation == null)
            {
                // Create initial allocation with the current total
                allocation = new CapitalAllocation
                {
                    ProposalId = proposal.Id,
                    AllocatedAmount = totalInvested,
                    DisbursedAmount = 0,
                    RemainingBalance = totalInvested,
                    AllocatedAt = DateTime.UtcNow
                };
                await _capitalRepository.AddAllocationAsync(allocation);
                await _capitalRepository.SaveChangesAsync();

                // Log transaction
                var tx = new Transaction
                {
                    CapitalAllocationId = allocation.Id,
                    Amount = request.Amount,
                    Type = TransactionTypes.Allocation,
                    Description = $"Investment by {(await _userRepository.GetByIdAsync(userId))?.FullName ?? "Investor"}: {request.Amount:C}",
                    TransactionDate = DateTime.UtcNow
                };
                await _capitalRepository.AddTransactionAsync(tx);
                await _capitalRepository.SaveChangesAsync();
            }
            else
            {
                // Update existing allocation with additional funds
                allocation.AllocatedAmount += request.Amount;
                allocation.RemainingBalance += request.Amount;

                var tx = new Transaction
                {
                    CapitalAllocationId = allocation.Id,
                    Amount = request.Amount,
                    Type = TransactionTypes.Allocation,
                    Description = $"Additional investment by {(await _userRepository.GetByIdAsync(userId))?.FullName ?? "Investor"}: {request.Amount:C}",
                    TransactionDate = DateTime.UtcNow
                };
                await _capitalRepository.AddTransactionAsync(tx);
                await _capitalRepository.SaveChangesAsync();
            }

            // Mark as FundAllocated once fully funded
            if (fullyFunded && proposal.Status == ProposalStatuses.Approved)
            {
                proposal.Status = ProposalStatuses.FundAllocated;
                proposal.UpdatedAt = DateTime.UtcNow;
                await _proposalRepository.SaveChangesAsync();
            }

            // Notify the submitter
            var notification = new Notification
            {
                UserId = proposal.SubmitterId,
                Title = fullyFunded ? "Proposal Fully Funded! 🎉" : "New Investment Received",
                Message = fullyFunded
                    ? $"Your proposal '{proposal.Title}' is now fully funded with {totalInvested:C}. You can begin requesting drawdowns."
                    : $"An investor committed {request.Amount:C} to your proposal '{proposal.Title}'. Total funded: {totalInvested:C} / {proposal.ApprovedAmount:C}."
            };
            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            await _hubContext.Clients.Group($"User_{proposal.SubmitterId}").SendAsync("ReceiveNotification", new
            {
                id = notification.Id,
                title = notification.Title,
                message = notification.Message,
                createdAt = notification.CreatedAt,
                isRead = false
            });

            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(new
            {
                message = fullyFunded ? "Investment committed — proposal fully funded!" : "Investment committed successfully.",
                investmentId = investment.Id,
                totalInvested,
                remainingToFund = proposal.ApprovedAmount - totalInvested,
                isFullyFunded = fullyFunded
            });
        }

        /// <summary>
        /// Get this investor's portfolio (all their investments with complete proposal details).
        /// </summary>
        [HttpGet("portfolio")]
        public async Task<IActionResult> GetPortfolio()
        {
            var userId = GetCurrentUserId();
            var investments = await _investmentRepository.GetByInvestorIdAsync(userId);

            var portfolio = new List<object>();
            foreach (var inv in investments)
            {
                var allocation = inv.Proposal != null
                    ? await _capitalRepository.GetAllocationByProposalIdAsync(inv.ProposalId)
                    : null;

                var prop = inv.Proposal;

                portfolio.Add(new
                {
                    inv.Id,
                    inv.ProposalId,
                    ProposalTitle = prop?.Title ?? "Unknown",
                    ProposalDescription = prop?.Description ?? "",
                    ProposalDepartment = prop?.Department ?? "",
                    ProposalStatus = prop?.Status ?? "",
                    SupportingDocumentPath = prop?.SupportingDocumentPath,
                    StartupName = prop?.StartupName,
                    ProblemStatement = prop?.ProblemStatement,
                    ProposedStatement = prop?.ProposedStatement,
                    BusinessModel = prop?.BusinessModel,
                    TeamDetails = prop?.TeamDetails,
                    DemoVideoUrl = prop?.DemoVideoUrl,
                    SubmitterName = prop?.Submitter?.FullName ?? "Founder",
                    SubmitterEmail = prop?.Submitter?.Email ?? "",
                    EquityOffered = prop?.EquityOffered,
                    RequestedAmount = prop?.RequestedAmount ?? 0,
                    ApprovedAmount = prop?.ApprovedAmount ?? 0,
                    inv.CommittedAmount,
                    inv.Notes,
                    inv.InvestedAt,
                    inv.Status,
                    TotalAllocated = allocation?.AllocatedAmount ?? 0,
                    TotalDisbursed = allocation?.DisbursedAmount ?? 0,
                    RemainingBalance = allocation?.RemainingBalance ?? 0,
                    DisbursementPercent = allocation != null && allocation.AllocatedAmount > 0
                        ? Math.Round((double)(allocation.DisbursedAmount / allocation.AllocatedAmount * 100), 1)
                        : 0
                });
            }

            return Ok(portfolio);
        }

        /// <summary>
        /// Portfolio summary: total committed, total disbursed, active count.
        /// </summary>
        [HttpGet("portfolio/summary")]
        public async Task<IActionResult> GetPortfolioSummary()
        {
            var userId = GetCurrentUserId();
            var investments = await _investmentRepository.GetByInvestorIdAsync(userId);

            decimal totalCommitted = 0;
            decimal totalDisbursed = 0;
            int activeCount = 0;

            foreach (var inv in investments)
            {
                totalCommitted += inv.CommittedAmount;
                if (inv.Status == InvestmentStatuses.Active) activeCount++;

                var allocation = await _capitalRepository.GetAllocationByProposalIdAsync(inv.ProposalId);
                if (allocation != null) totalDisbursed += allocation.DisbursedAmount;
            }

            return Ok(new
            {
                TotalCommitted = totalCommitted,
                TotalDisbursed = totalDisbursed,
                ActiveInvestments = activeCount,
                TotalInvestments = investments.Count()
            });
        }
    }

    public class InvestRequest
    {
        public int ProposalId { get; set; }
        public decimal Amount { get; set; }
        public string? Notes { get; set; }
    }
}
