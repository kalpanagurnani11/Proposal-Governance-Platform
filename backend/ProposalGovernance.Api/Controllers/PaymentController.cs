using System;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProposalGovernance.Api.Models;
using ProposalGovernance.Api.Services;

namespace ProposalGovernance.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;
        private readonly ISubscriptionService _subscriptionService;
        private readonly IAuditLogService _auditLog;

        public PaymentController(
            IPaymentService paymentService,
            ISubscriptionService subscriptionService,
            IAuditLogService auditLog)
        {
            _paymentService = paymentService;
            _subscriptionService = subscriptionService;
            _auditLog = auditLog;
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

        public class CreateOrderRequest
        {
            public decimal Amount { get; set; }
            public string PaymentType { get; set; } = string.Empty; // "FounderPremium", "InvestorPremium", "FeaturedStartup"
            public string Currency { get; set; } = "INR";
        }

        [Authorize]
        [HttpPost("create-order")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            int userId = GetCurrentUserId();
            if (userId == 0) return Unauthorized();

            // Price validation for security
            decimal finalAmount = request.Amount;
            if (request.PaymentType.Equals("FounderPremium", StringComparison.OrdinalIgnoreCase) ||
                request.PaymentType.Equals("InvestorPremium", StringComparison.OrdinalIgnoreCase))
            {
                finalAmount = 20.00m; // Enforce ₹20.00 pricing for Premium subscriptions
            }

            var order = await _paymentService.CreateOrderAsync(userId, finalAmount, request.PaymentType, request.Currency);
            return Ok(order);
        }

        [Authorize]
        [HttpPost("verify")]
        public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest request)
        {
            int userId = GetCurrentUserId();
            string username = GetCurrentUsername();
            if (userId == 0) return Unauthorized();

            if (!ModelState.IsValid) return BadRequest(ModelState);

            var verifyResult = await _paymentService.VerifyPaymentSignatureAsync(userId, request);

            if (!verifyResult.Success)
            {
                return BadRequest(new { success = false, message = verifyResult.Error ?? "Signature verification failed." });
            }

            // Post-verification business logic trigger
            if (request.PaymentType.Contains("Founder") || request.PaymentType.Contains("Investor") || request.SubscriptionId.HasValue)
            {
                int subId = request.SubscriptionId ?? (request.PaymentType.Contains("Investor") ? 4 : 2);
                bool activated = await _subscriptionService.ActivateSubscriptionAsync(userId, subId, verifyResult.TransactionReference);
                if (activated)
                {
                    await _auditLog.LogAsync(userId, username, "SubscriptionActivated", "UserSubscription", subId, $"Activated premium plan via Razorpay payment. Ref: {verifyResult.TransactionReference}", HttpContext.Connection.RemoteIpAddress?.ToString());
                }
            }

            return Ok(verifyResult);
        }

        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> HandleWebhook()
        {
            using var reader = new StreamReader(Request.Body);
            string jsonBody = await reader.ReadToEndAsync();
            string signatureHeader = Request.Headers["X-Razorpay-Signature"].ToString();

            bool handled = await _paymentService.ProcessWebhookEventAsync(jsonBody, signatureHeader);
            if (handled)
            {
                return Ok(new { status = "Webhook processed successfully" });
            }
            return BadRequest(new { status = "Invalid webhook payload or signature" });
        }

        [Authorize]
        [HttpGet("history")]
        public async Task<IActionResult> GetHistory()
        {
            int userId = GetCurrentUserId();
            var history = await _paymentService.GetPaymentHistoryAsync(userId);
            return Ok(history);
        }
    }
}
