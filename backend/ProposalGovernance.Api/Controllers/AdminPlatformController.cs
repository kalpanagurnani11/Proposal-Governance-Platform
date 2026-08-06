using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize(Roles = UserRoles.Admin)]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminPlatformController : ControllerBase
    {
        private readonly GovernanceDbContext _context;

        public AdminPlatformController(GovernanceDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetAdminDashboardStats()
        {
            var activeSubscribers = await _context.UserSubscriptions
                .CountAsync(us => us.Status == "Active" && us.EndDate > DateTime.UtcNow);

            var premiumFounders = await _context.UserSubscriptions
                .CountAsync(us => us.Status == "Active" && us.EndDate > DateTime.UtcNow && us.SubscriptionId == 2);

            var premiumInvestors = await _context.UserSubscriptions
                .CountAsync(us => us.Status == "Active" && us.EndDate > DateTime.UtcNow && us.SubscriptionId == 4);

            // Trust Score Distribution
            var trustScores = await _context.StartupTrustScores.ToListAsync();
            var excellentCount = trustScores.Count(t => t.TrustScore >= 80);
            var goodCount = trustScores.Count(t => t.TrustScore >= 60 && t.TrustScore < 80);
            var moderateCount = trustScores.Count(t => t.TrustScore >= 40 && t.TrustScore < 60);
            var highRiskCount = trustScores.Count(t => t.TrustScore < 40);

            var verifiedStartups = await _context.StartupVerifications
                .CountAsync(sv => sv.OverallStatus == "Verified");

            var patentVerified = await _context.StartupPatentInfos
                .CountAsync(sp => sp.VerificationStatus == "Verified");

            // Mock Revenue
            var revenue = await _context.Payments
                .Where(p => p.Status == "Success")
                .SumAsync(p => p.Amount);

            var featuredPurchases = await _context.FeaturedListings.CountAsync();

            return Ok(new
            {
                activeSubscribers,
                premiumFounders,
                premiumInvestors,
                verifiedStartups,
                patentVerified,
                totalRevenue = revenue,
                featuredPurchases,
                trustDistribution = new
                {
                    Excellent = excellentCount,
                    Good = goodCount,
                    Moderate = moderateCount,
                    HighRisk = highRiskCount
                }
            });
        }

        [HttpGet("subscribers")]
        public async Task<IActionResult> GetActiveSubscribers()
        {
            var subscribers = await _context.UserSubscriptions
                .Include(us => us.User)
                .Include(us => us.Subscription)
                .OrderByDescending(us => us.StartDate)
                .Select(us => new
                {
                    us.Id,
                    userId = us.UserId,
                    username = us.User!.Username,
                    fullName = us.User.FullName,
                    email = us.User.Email,
                    contactNumber = us.User.ContactNumber,
                    role = us.User.Role,
                    subscriptionId = us.SubscriptionId,
                    subscriptionName = us.Subscription!.Name,
                    price = us.Subscription.Price,
                    startDate = us.StartDate,
                    endDate = us.EndDate,
                    status = us.Status,
                    paymentId = us.PaymentId
                })
                .ToListAsync();

            return Ok(subscribers);
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .OrderByDescending(u => u.Id)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.ContactNumber,
                    u.Role,
                    u.Department,
                    u.PatentId,
                    u.PatentVerificationStatus
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("audit-logs")]
        public async Task<IActionResult> GetAuditLogs()
        {
            var logs = await _context.AuditLogs
                .OrderByDescending(al => al.CreatedAt)
                .Take(100)
                .ToListAsync();

            return Ok(logs);
        }

        [HttpGet("nda-records")]
        public async Task<IActionResult> GetNdaRecords()
        {
            var ndas = await _context.NDAAgreements
                .Include(n => n.Startup)
                .Include(n => n.Investor)
                .OrderByDescending(n => n.AcceptedAt)
                .Select(n => new
                {
                    n.Id,
                    startupId = n.StartupId,
                    startupTitle = n.Startup!.Title,
                    startupName = n.Startup.StartupName,
                    investorName = n.Investor!.FullName,
                    investorEmail = n.Investor.Email,
                    investorContactNumber = n.Investor.ContactNumber,
                    acceptedAt = n.AcceptedAt,
                    ipAddress = n.IpAddress,
                    version = n.Version
                })
                .ToListAsync();

            return Ok(ndas);
        }

        [HttpGet("patent-risks")]
        public async Task<IActionResult> GetPatentRiskReports()
        {
            var highRisks = await _context.PatentCheckResults
                .Include(pr => pr.Startup)
                .Where(pr => pr.PatentRiskLevel == "High")
                .ToListAsync();

            return Ok(highRisks);
        }
    }
}
