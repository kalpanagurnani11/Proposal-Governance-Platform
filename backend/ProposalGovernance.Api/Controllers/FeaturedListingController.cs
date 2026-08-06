using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Services;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class FeaturedListingController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly IPaymentService _paymentService;
        private readonly IAuditLogService _auditLogService;

        public FeaturedListingController(
            GovernanceDbContext context,
            IPaymentService paymentService,
            IAuditLogService auditLogService)
        {
            _context = context;
            _paymentService = paymentService;
            _auditLogService = auditLogService;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            return claim != null ? int.Parse(claim.Value) : 0;
        }

        private string GetCurrentUsername()
        {
            return User.Identity?.Name ?? "Unknown";
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveFeaturedListings()
        {
            var listings = await _context.FeaturedListings
                .Include(f => f.Startup)
                .Where(f => f.Status == "Active" && f.EndDate > DateTime.UtcNow)
                .ToListAsync();

            return Ok(listings);
        }

        [Authorize(Roles = UserRoles.Founder)]
        [HttpGet("my")]
        public async Task<IActionResult> GetMyFeaturedListings()
        {
            var userId = GetCurrentUserId();
            var listings = await _context.FeaturedListings
                .Include(f => f.Startup)
                .Where(f => f.UserId == userId)
                .OrderByDescending(f => f.EndDate)
                .ToListAsync();

            return Ok(listings);
        }

        [Authorize(Roles = UserRoles.Founder)]
        [HttpPost("purchase")]
        public async Task<IActionResult> PurchaseFeaturedListing([FromBody] PurchaseFeaturedRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var username = GetCurrentUsername();

            var proposal = await _context.Proposals
                .FirstOrDefaultAsync(p => p.Id == request.StartupId && p.SubmitterId == userId);

            if (proposal == null)
            {
                return NotFound(new { message = "Proposal not found or you are not authorized to feature this proposal." });
            }

            decimal price = request.DurationInDays == 7 ? 1999.00m : 4999.00m;
            
            var razorpayOrder = await _paymentService.CreateOrderAsync(userId, price, "FeaturedStartup");
            return Ok(new
            {
                success = true,
                orderId = razorpayOrder.OrderId,
                amount = razorpayOrder.Amount,
                amountInPaise = razorpayOrder.AmountInPaise,
                currency = razorpayOrder.Currency,
                keyId = razorpayOrder.KeyId,
                paymentType = "FeaturedStartup",
                startupId = request.StartupId,
                durationInDays = request.DurationInDays,
                message = "Razorpay order for featured listing created successfully."
            });
        }

        [Authorize(Roles = UserRoles.Founder)]
        [HttpPost("verify")]
        public async Task<IActionResult> VerifyFeaturedListingPayment([FromBody] VerifyPaymentRequest request)
        {
            int userId = GetCurrentUserId();
            string username = GetCurrentUsername();

            var verifyResult = await _paymentService.VerifyPaymentSignatureAsync(userId, request);
            if (!verifyResult.Success)
            {
                return BadRequest(new { success = false, message = verifyResult.Error ?? "Signature verification failed." });
            }

            if (request.ProposalId.HasValue)
            {
                int startupId = request.ProposalId.Value;
                int duration = request.DurationInDays ?? 7;

                var existing = await _context.FeaturedListings
                    .Where(f => f.StartupId == startupId && f.Status == "Active")
                    .ToListAsync();
                foreach (var ex in existing) ex.Status = "Expired";

                var start = DateTime.UtcNow;
                var end = start.AddDays(duration);

                var featured = new FeaturedListing
                {
                    StartupId = startupId,
                    UserId = userId,
                    StartDate = start,
                    EndDate = end,
                    Status = "Active"
                };

                await _context.FeaturedListings.AddAsync(featured);
                await _context.SaveChangesAsync();

                await _auditLogService.LogAsync(userId, username, "PurchaseFeaturedListingSuccess", "FeaturedListing", featured.Id, $"Featured proposal for {duration} days. Ref: {verifyResult.TransactionReference}", HttpContext.Connection.RemoteIpAddress?.ToString());
            }

            return Ok(verifyResult);
        }
    }

    public class PurchaseFeaturedRequest
    {
        public int StartupId { get; set; }
        public int DurationInDays { get; set; } // 7 or 30
    }
}
