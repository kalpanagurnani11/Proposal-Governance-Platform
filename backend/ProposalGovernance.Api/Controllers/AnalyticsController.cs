using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Repositories;
using ProposalGovernance.Api.Services;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IProposalRepository _proposalRepository;
        private readonly ICapitalRepository _capitalRepository;
        private readonly IUserRepository _userRepository;
        private readonly IReviewRepository _reviewRepository;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _config;

        public AnalyticsController(
            IProposalRepository proposalRepository,
            ICapitalRepository capitalRepository,
            IUserRepository userRepository,
            IReviewRepository reviewRepository,
            IEmailService emailService,
            IConfiguration config)
        {
            _proposalRepository = proposalRepository;
            _capitalRepository = capitalRepository;
            _userRepository = userRepository;
            _reviewRepository = reviewRepository;
            _emailService = emailService;
            _config = config;
        }

        private decimal GetTotalCapitalPool()
        {
            var poolStr = _config["CapitalPool:TotalPoolAmount"] ?? "10000000.00";
            return decimal.Parse(poolStr);
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardMetrics()
        {
            var proposals = (await _proposalRepository.GetAllAsync()).ToList();
            var allocations = (await _capitalRepository.GetAllAllocationsAsync()).ToList();

            // Status distribution
            var statusCounts = proposals
                .GroupBy(p => p.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            // Add missing statuses for frontend consistency
            var statuses = new[] { "Draft", "Submitted", "UnderReview", "Reviewed", "Approved", "Rejected", "FundAllocated" };
            foreach (var status in statuses)
            {
                if (!statusCounts.ContainsKey(status))
                    statusCounts[status] = 0;
            }

            // Department requested amounts
            var departmentSummary = proposals
                .GroupBy(p => p.Department)
                .Select(g => new
                {
                    Department = g.Key,
                    Count = g.Count(),
                    TotalRequested = g.Sum(p => p.RequestedAmount),
                    TotalApproved = g.Sum(p => p.ApprovedAmount)
                })
                .ToList();

            // Financial Summary
            decimal totalPool = GetTotalCapitalPool();
            decimal allocated = allocations.Sum(a => a.AllocatedAmount);
            decimal disbursed = allocations.Sum(a => a.DisbursedAmount);
            decimal remaining = totalPool - allocated;

            // Fetch transaction list for feed
            var transactions = new List<Transaction>();
            foreach (var alloc in allocations)
            {
                var txs = await _capitalRepository.GetTransactionsByAllocationIdAsync(alloc.Id);
                transactions.AddRange(txs);
            }
            var recentTransactions = transactions
                .OrderByDescending(t => t.TransactionDate)
                .Take(10)
                .Select(t => new
                {
                    t.Id,
                    t.CapitalAllocationId,
                    ProposalTitle = t.CapitalAllocation?.Proposal?.Title ?? "Budget Allocation",
                    t.Amount,
                    t.Type,
                    t.Description,
                    t.TransactionDate
                })
                .ToList();

            // Review Scoring average
            var allReviews = new List<Review>();
            foreach (var prop in proposals)
            {
                var revs = await _reviewRepository.GetByProposalIdAsync(prop.Id);
                allReviews.AddRange(revs);
            }

            decimal avgFeasibility = allReviews.Any() ? (decimal)allReviews.Average(r => r.FeasibilityScore) : 0;
            decimal avgStrategic = allReviews.Any() ? (decimal)allReviews.Average(r => r.StrategicScore) : 0;
            decimal avgRisk = allReviews.Any() ? (decimal)allReviews.Average(r => r.RiskScore) : 0;
            decimal avgRoi = allReviews.Any() ? (decimal)allReviews.Average(r => r.RoiScore) : 0;

            // Simple predictive analytics: projection of next budget request size and strategic trend
            decimal nextProjectedRequest = proposals.Any() ? proposals.Average(p => p.RequestedAmount) : 500000;
            string topDepartmentDemand = departmentSummary.OrderByDescending(d => d.TotalRequested).FirstOrDefault()?.Department ?? "None";

            return Ok(new
            {
                StatusDistribution = statusCounts,
                DepartmentSummary = departmentSummary,
                CapitalPool = new
                {
                    TotalPool = totalPool,
                    Allocated = allocated,
                    Disbursed = disbursed,
                    Remaining = remaining
                },
                RecentTransactions = recentTransactions,
                AverageScores = new
                {
                    Feasibility = Math.Round(avgFeasibility, 2),
                    Strategic = Math.Round(avgStrategic, 2),
                    Risk = Math.Round(avgRisk, 2), // 10 is low risk
                    Roi = Math.Round(avgRoi, 2)
                },
                Predictive = new
                {
                    ProjectedAverageDemand = Math.Round(nextProjectedRequest, 2),
                    TopDepartment = topDepartmentDemand,
                    RemainingDaysCapitalRunsOut = remaining > 0 && allocated > 0 ? Math.Round((remaining / (allocated / 30.0m)), 1) : 365
                }
            });
        }

        [HttpGet("emails")]
        public async Task<IActionResult> GetMockEmails()
        {
            var emails = await _emailService.GetSentEmailsAsync();
            return Ok(emails);
        }
    }
}
