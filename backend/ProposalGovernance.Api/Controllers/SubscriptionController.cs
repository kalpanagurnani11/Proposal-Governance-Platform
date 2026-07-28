using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProposalGovernance.Api.Services;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private readonly IPaymentService _paymentService;
        private readonly IAuditLogService _auditLogService;

        public SubscriptionController(
            ISubscriptionService subscriptionService,
            IPaymentService paymentService,
            IAuditLogService auditLogService)
        {
            _subscriptionService = subscriptionService;
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

        [HttpGet("plans")]
        public async Task<IActionResult> GetPlans([FromQuery] string role)
        {
            var plans = await _subscriptionService.GetAvailablePlansAsync(role);
            return Ok(plans);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyActiveSubscription()
        {
            var userId = GetCurrentUserId();
            var activeSub = await _subscriptionService.GetActiveSubscriptionAsync(userId);
            if (activeSub == null)
            {
                return Ok(new { hasActive = false, message = "No active subscription found." });
            }
            return Ok(new { hasActive = true, data = activeSub });
        }

        [HttpPost("buy")]
        public async Task<IActionResult> BuySubscription([FromBody] BuySubscriptionRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var username = GetCurrentUsername();
            var plans = await _subscriptionService.GetAvailablePlansAsync(request.Role);
            var plan = plans.FirstOrDefault(p => p.Id == request.SubscriptionId);

            if (plan == null)
            {
                return NotFound(new { message = "Subscription plan not found or not applicable to your role." });
            }

            // Process payment through mock service
            string paymentType = request.Role == UserRoles.Founder ? "FounderPremium" : "InvestorPremium";
            if (plan.Price == 0)
            {
                // Free plan activation does not require payment record processing
                bool successFree = await _subscriptionService.ActivateSubscriptionAsync(userId, plan.Id, "FREE-PLAN");
                await _auditLogService.LogAsync(userId, username, "ActivateFreeSubscription", "UserSubscription", plan.Id, $"Activated free plan: {plan.Name}", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { success = true, message = "Free subscription tier activated successfully." });
            }

            var paymentResult = await _paymentService.ProcessPaymentAsync(userId, plan.Price, paymentType);
            
            if (paymentResult.Success)
            {
                bool activeSuccess = await _subscriptionService.ActivateSubscriptionAsync(userId, plan.Id, paymentResult.TransactionReference);
                if (activeSuccess)
                {
                    await _auditLogService.LogAsync(userId, username, "PurchaseSubscriptionSuccess", "UserSubscription", plan.Id, $"Purchased Premium subscription: {plan.Name}. Ref: {paymentResult.TransactionReference}", HttpContext.Connection.RemoteIpAddress?.ToString());
                    return Ok(new { success = true, reference = paymentResult.TransactionReference, message = "Premium plan activated successfully!" });
                }
                return StatusCode(500, new { message = "Payment was successful, but failed to activate subscription. Please contact support." });
            }

            await _auditLogService.LogAsync(userId, username, "PurchaseSubscriptionFailed", "Payment", 0, $"Failed premium purchase attempt. Amount: {plan.Price}", HttpContext.Connection.RemoteIpAddress?.ToString());
            return BadRequest(new { success = false, message = paymentResult.ErrorMessage ?? "Payment failed." });
        }

        [HttpPost("cancel")]
        public async Task<IActionResult> CancelSubscription()
        {
            var userId = GetCurrentUserId();
            var username = GetCurrentUsername();
            
            var activeSub = await _subscriptionService.GetActiveSubscriptionAsync(userId);
            if (activeSub == null)
            {
                return BadRequest(new { message = "No active subscription found to cancel." });
            }

            bool success = await _subscriptionService.DeactivateSubscriptionAsync(userId);
            if (success)
            {
                await _auditLogService.LogAsync(userId, username, "CancelSubscription", "UserSubscription", activeSub.SubscriptionId, $"Cancelled subscription plan: {activeSub.Subscription?.Name}", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { success = true, message = "Subscription plan deactivated successfully." });
            }

            return StatusCode(500, new { message = "Failed to deactivate subscription." });
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetPaymentHistory()
        {
            var userId = GetCurrentUserId();
            var history = await _paymentService.GetPaymentHistoryAsync(userId);
            return Ok(history);
        }
    }

    public class BuySubscriptionRequest
    {
        public int SubscriptionId { get; set; }
        public string Role { get; set; } = string.Empty; // "Submitter" or "Investor"
    }
}
