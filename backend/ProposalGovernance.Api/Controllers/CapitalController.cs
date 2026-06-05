using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using ProposalGovernance.Api.Hubs;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Repositories;
using ProposalGovernance.Api.Services;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CapitalController : ControllerBase
    {
        private readonly ICapitalRepository _capitalRepository;
        private readonly IProposalRepository _proposalRepository;
        private readonly INotificationRepository _notificationRepository;
        private readonly IUserRepository _userRepository;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IConfiguration _config;

        public CapitalController(
            ICapitalRepository capitalRepository,
            IProposalRepository proposalRepository,
            INotificationRepository notificationRepository,
            IUserRepository userRepository,
            IHubContext<NotificationHub> hubContext,
            IConfiguration config)
        {
            _capitalRepository = capitalRepository;
            _proposalRepository = proposalRepository;
            _notificationRepository = notificationRepository;
            _userRepository = userRepository;
            _hubContext = hubContext;
            _config = config;
        }

        private decimal GetTotalCapitalPool()
        {
            var poolStr = _config["CapitalPool:TotalPoolAmount"] ?? "10000000.00"; // Default $10M pool
            return decimal.Parse(poolStr);
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var totalPool = GetTotalCapitalPool();
            var allocations = await _capitalRepository.GetAllAllocationsAsync();

            decimal allocated = 0;
            decimal disbursed = 0;

            foreach (var alloc in allocations)
            {
                allocated += alloc.AllocatedAmount;
                disbursed += alloc.DisbursedAmount;
            }

            decimal remaining = totalPool - allocated;

            return Ok(new
            {
                TotalPool = totalPool,
                Allocated = allocated,
                Disbursed = disbursed,
                Remaining = remaining
            });
        }

        [HttpGet("allocations")]
        public async Task<IActionResult> GetAllocations()
        {
            var allocations = await _capitalRepository.GetAllAllocationsAsync();
            return Ok(allocations);
        }

        [HttpGet("proposal/{proposalId}")]
        public async Task<IActionResult> GetAllocationByProposal(int proposalId)
        {
            var allocation = await _capitalRepository.GetAllocationByProposalIdAsync(proposalId);
            if (allocation == null)
                return NotFound(new { message = "Capital allocation not found for this proposal." });

            return Ok(allocation);
        }

        [HttpGet("transactions/{allocationId}")]
        public async Task<IActionResult> GetTransactions(int allocationId)
        {
            var transactions = await _capitalRepository.GetTransactionsByAllocationIdAsync(allocationId);
            return Ok(transactions);
        }

        [Authorize(Roles = UserRoles.Admin)]
        [HttpPost("allocate")]
        public async Task<IActionResult> AllocateFunds([FromBody] AllocateFundsRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var proposal = await _proposalRepository.GetByIdAsync(request.ProposalId);
            if (proposal == null)
                return NotFound(new { message = "Proposal not found." });

            if (proposal.Status != ProposalStatuses.Approved)
                return BadRequest(new { message = "Only approved proposals can be allocated capital." });

            var existingAllocation = await _capitalRepository.GetAllocationByProposalIdAsync(proposal.Id);
            if (existingAllocation != null)
                return BadRequest(new { message = "Capital has already been allocated for this proposal." });

            // Check if capital pool has enough balance
            var summary = await GetSummaryInternal();
            if (proposal.ApprovedAmount > summary.Remaining)
                return BadRequest(new { message = $"Insufficient funds in capital pool. Remaining: {summary.Remaining:C}, Requested: {proposal.ApprovedAmount:C}" });

            var newAllocation = new CapitalAllocation
            {
                ProposalId = proposal.Id,
                AllocatedAmount = proposal.ApprovedAmount,
                DisbursedAmount = 0,
                RemainingBalance = proposal.ApprovedAmount,
                AllocatedAt = DateTime.UtcNow
            };

            await _capitalRepository.AddAllocationAsync(newAllocation);
            await _capitalRepository.SaveChangesAsync(); // Generates ID

            // Add Transaction
            var tx = new Transaction
            {
                CapitalAllocationId = newAllocation.Id,
                Amount = proposal.ApprovedAmount,
                Type = TransactionTypes.Allocation,
                Description = $"Initial capital allocation for project '{proposal.Title}'",
                TransactionDate = DateTime.UtcNow
            };
            await _capitalRepository.AddTransactionAsync(tx);

            // Update Proposal Status
            proposal.Status = ProposalStatuses.FundAllocated;
            proposal.UpdatedAt = DateTime.UtcNow;

            await _proposalRepository.SaveChangesAsync();
            await _capitalRepository.SaveChangesAsync();

            // Notify submitter
            var notification = new Notification
            {
                UserId = proposal.SubmitterId,
                Title = "Capital Allocated & Active",
                Message = $"Capital funds of {newAllocation.AllocatedAmount:C} have been allocated and are ready for drawdown for your proposal '{proposal.Title}'."
            };
            await _notificationRepository.AddAsync(notification);
            await _notificationRepository.SaveChangesAsync();

            // SignalR
            await _hubContext.Clients.Group($"User_{proposal.SubmitterId}").SendAsync("ReceiveNotification", new
            {
                id = notification.Id,
                title = notification.Title,
                message = notification.Message,
                createdAt = notification.CreatedAt,
                isRead = false
            });

            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(newAllocation);
        }

        [HttpPost("drawdown")]
        public async Task<IActionResult> RequestDrawdown([FromBody] DrawdownRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var allocation = await _capitalRepository.GetAllocationByProposalIdAsync(request.ProposalId);
            if (allocation == null)
                return NotFound(new { message = "Capital allocation not found." });

            var proposal = allocation.Proposal;
            if (proposal == null)
                return BadRequest(new { message = "Associated proposal not found." });

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (role != UserRoles.Admin && proposal.SubmitterId != userId)
                return Forbid();

            if (request.Amount <= 0)
                return BadRequest(new { message = "Drawdown amount must be greater than zero." });

            if (request.Amount > allocation.RemainingBalance)
                return BadRequest(new { message = $"Insufficient remaining balance. Available: {allocation.RemainingBalance:C}, Requested: {request.Amount:C}" });

            // Disburse funds
            allocation.DisbursedAmount += request.Amount;
            allocation.RemainingBalance -= request.Amount;

            var tx = new Transaction
            {
                CapitalAllocationId = allocation.Id,
                Amount = request.Amount,
                Type = TransactionTypes.Drawdown,
                Description = request.Description ?? "Standard drawdown request",
                TransactionDate = DateTime.UtcNow
            };
            await _capitalRepository.AddTransactionAsync(tx);

            await _capitalRepository.SaveChangesAsync();

            // Notify admin about drawdown
            var adminNotification = new Notification
            {
                UserId = 1, // Admin
                Title = "Capital Drawdown Processed",
                Message = $"A drawdown of {request.Amount:C} was executed for proposal '{proposal.Title}' ({proposal.Department}). Description: {tx.Description}."
            };
            await _notificationRepository.AddAsync(adminNotification);
            await _notificationRepository.SaveChangesAsync();

            // SignalR
            await _hubContext.Clients.Group("Role_Admin").SendAsync("ReceiveNotification", new
            {
                id = adminNotification.Id,
                title = adminNotification.Title,
                message = adminNotification.Message,
                createdAt = adminNotification.CreatedAt,
                isRead = false
            });

            await _hubContext.Clients.All.SendAsync("DashboardUpdated");

            return Ok(allocation);
        }

        private async Task<(decimal Total, decimal Allocated, decimal Disbursed, decimal Remaining)> GetSummaryInternal()
        {
            var totalPool = GetTotalCapitalPool();
            var allocations = await _capitalRepository.GetAllAllocationsAsync();

            decimal allocated = 0;
            decimal disbursed = 0;

            foreach (var alloc in allocations)
            {
                allocated += alloc.AllocatedAmount;
                disbursed += alloc.DisbursedAmount;
            }

            decimal remaining = totalPool - allocated;

            return (totalPool, allocated, disbursed, remaining);
        }
    }

    public class AllocateFundsRequest
    {
        public int ProposalId { get; set; }
    }

    public class DrawdownRequest
    {
        public int ProposalId { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
    }
}
