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

        private string GetCurrentUserRole()
        {
            return User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        }

        private bool IsAuthorizedSubscriptionRole()
        {
            var role = GetCurrentUserRole();
            return role == UserRoles.Founder || role == UserRoles.Investor || role == UserRoles.Submitter;
        }

        [HttpGet("plans")]
        public async Task<IActionResult> GetPlans([FromQuery] string role)
        {
            if (!IsAuthorizedSubscriptionRole())
            {
                return StatusCode(403, new { message = "Subscription module is available only for Founder and Investor roles." });
            }

            var targetRole = string.IsNullOrWhiteSpace(role) ? GetCurrentUserRole() : role;
            var plans = await _subscriptionService.GetAvailablePlansAsync(targetRole);
            return Ok(plans);
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMyActiveSubscription()
        {
            if (!IsAuthorizedSubscriptionRole())
            {
                return StatusCode(403, new { message = "Subscription module is available only for Founder and Investor roles." });
            }

            var userId = GetCurrentUserId();
            var activeSub = await _subscriptionService.GetActiveSubscriptionAsync(userId);

            if (activeSub == null)
            {
                // Auto-assign Free plan as default for Founder / Investor
                var userRole = GetCurrentUserRole();
                var plans = await _subscriptionService.GetAvailablePlansAsync(userRole);
                var freePlan = plans.FirstOrDefault(p => p.Price == 0);
                if (freePlan != null)
                {
                    await _subscriptionService.ActivateSubscriptionAsync(userId, freePlan.Id, "AUTO-FREE-DEFAULT");
                    activeSub = await _subscriptionService.GetActiveSubscriptionAsync(userId);
                }
            }

            if (activeSub == null)
            {
                return Ok(new { hasActive = false, message = "No active subscription found." });
            }
            return Ok(new { hasActive = true, data = activeSub });
        }

        [HttpPost("buy")]
        public async Task<IActionResult> BuySubscription([FromBody] BuySubscriptionRequest request)
        {
            if (!IsAuthorizedSubscriptionRole())
            {
                return StatusCode(403, new { message = "Subscription module is available only for Founder and Investor roles." });
            }

            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetCurrentUserId();
            var username = GetCurrentUsername();
            var requestRole = string.IsNullOrWhiteSpace(request.Role) ? GetCurrentUserRole() : request.Role;
            var plans = await _subscriptionService.GetAvailablePlansAsync(requestRole);
            var plan = plans.FirstOrDefault(p => p.Id == request.SubscriptionId);

            if (plan == null)
            {
                return NotFound(new { message = "Subscription plan not found or not applicable to your role." });
            }

            string paymentType = requestRole == UserRoles.Founder ? "FounderPremium" : "InvestorPremium";
            if (plan.Price == 0)
            {
                bool successFree = await _subscriptionService.ActivateSubscriptionAsync(userId, plan.Id, "FREE-PLAN");
                await _auditLogService.LogAsync(userId, username, "ActivateFreeSubscription", "UserSubscription", plan.Id, $"Activated free plan: {plan.Name}", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { success = true, isFree = true, message = "Free subscription tier activated successfully." });
            }

            // Create Razorpay Order for premium payment
            var razorpayOrder = await _paymentService.CreateOrderAsync(userId, plan.Price, paymentType);
            return Ok(new
            {
                success = true,
                isFree = false,
                orderId = razorpayOrder.OrderId,
                amount = razorpayOrder.Amount,
                amountInPaise = razorpayOrder.AmountInPaise,
                currency = razorpayOrder.Currency,
                keyId = razorpayOrder.KeyId,
                subscriptionId = plan.Id,
                paymentType = paymentType,
                planName = plan.Name,
                message = "Razorpay order created successfully."
            });
        }

        [HttpPost("cancel")]
        public async Task<IActionResult> CancelSubscription()
        {
            if (!IsAuthorizedSubscriptionRole())
            {
                return StatusCode(403, new { message = "Subscription module is available only for Founder and Investor roles." });
            }

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
            if (!IsAuthorizedSubscriptionRole())
            {
                return StatusCode(403, new { message = "Subscription module is available only for Founder and Investor roles." });
            }

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
