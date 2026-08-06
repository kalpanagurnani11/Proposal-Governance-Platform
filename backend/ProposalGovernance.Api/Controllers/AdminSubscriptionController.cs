using System;
using System.Collections.Generic;
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
    [Authorize(Roles = UserRoles.Admin)]
    [ApiController]
    [Route("api/admin/subscriptions")]
    public class AdminSubscriptionController : ControllerBase
    {
        private readonly GovernanceDbContext _context;
        private readonly ISubscriptionService _subscriptionService;
        private readonly IAuditLogService _auditLogService;

        public AdminSubscriptionController(
            GovernanceDbContext context,
            ISubscriptionService subscriptionService,
            IAuditLogService auditLogService)
        {
            _context = context;
            _subscriptionService = subscriptionService;
            _auditLogService = auditLogService;
        }

        private int GetAdminId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        private string GetAdminUsername() => User.FindFirstValue(ClaimTypes.Name) ?? "Admin";

        // GET /api/admin/subscriptions/users
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] string? search = null, [FromQuery] string? role = null)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(u => u.Username.Contains(search) || u.FullName.Contains(search) || u.Email.Contains(search));
            }

            if (!string.IsNullOrEmpty(role) && !string.Equals(role, "All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(u => u.Role == role);
            }

            var usersList = await query.ToListAsync();
            var results = new List<object>();

            foreach (var user in usersList)
            {
                // Find active or last subscription
                var activeSub = await _context.UserSubscriptions
                    .Include(us => us.Subscription)
                    .Where(us => us.UserId == user.Id)
                    .OrderByDescending(us => us.EndDate)
                    .FirstOrDefaultAsync();

                results.Add(new
                {
                    user.Id,
                    user.Username,
                    user.FullName,
                    user.Email,
                    contactNumber = user.ContactNumber,
                    user.Role,
                    Subscription = activeSub != null ? new
                    {
                        activeSub.Id,
                        PlanName = activeSub.Subscription?.Name ?? "Unknown",
                        activeSub.StartDate,
                        activeSub.EndDate,
                        activeSub.Status,
                        activeSub.GrantedMethod,
                        activeSub.TotalReviewerConsultations,
                        activeSub.RemainingReviewerConsultations
                    } : null
                });
            }

            return Ok(results);
        }

        // GET /api/admin/subscriptions/{userId}
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUserSubscriptionDetail(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            var subscriptions = await _context.UserSubscriptions
                .Include(us => us.Subscription)
                .Where(us => us.UserId == userId)
                .OrderByDescending(us => us.StartDate)
                .ToListAsync();

            var history = await _context.SubscriptionHistories
                .Include(h => h.ChangedByAdmin)
                .Where(h => h.UserId == userId)
                .OrderByDescending(h => h.CreatedAt)
                .Select(h => new
                {
                    h.Id,
                    h.Action,
                    h.OldPlan,
                    h.NewPlan,
                    h.Reason,
                    h.CreatedAt,
                    ChangedByAdminName = h.ChangedByAdmin != null ? h.ChangedByAdmin.FullName : "System/Payment"
                })
                .ToListAsync();

            return Ok(new
            {
                User = new { user.Id, user.Username, user.FullName, user.Email, user.Role },
                Subscriptions = subscriptions,
                History = history
            });
        }

        // POST /api/admin/subscriptions/grant
        [HttpPost("grant")]
        public async Task<IActionResult> GrantSubscription([FromBody] GrantSubscriptionInput input)
        {
            var adminId = GetAdminId();
            var adminUser = GetAdminUsername();

            var user = await _context.Users.FindAsync(input.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            var plan = await _context.Subscriptions.FindAsync(input.SubscriptionId);
            if (plan == null) return NotFound(new { message = "Subscription plan not found." });

            // Check if plan matches user role
            if (plan.UserRole != user.Role && user.Role != UserRoles.Admin)
            {
                return BadRequest(new { message = $"Plan role '{plan.UserRole}' does not match user role '{user.Role}'." });
            }

            var existing = await _subscriptionService.GetActiveSubscriptionAsync(input.UserId);
            string? oldPlanName = existing?.Subscription?.Name;

            // Deactivate existing subscription
            await _subscriptionService.DeactivateSubscriptionAsync(input.UserId);

            var start = DateTime.UtcNow;
            var end = plan.DurationInDays >= 9999 ? DateTime.MaxValue : start.AddDays(plan.DurationInDays);

            bool isPremium = plan.Name.Contains("Premium");
            int consultationLimit = 0;
            if (isPremium)
            {
                var configVal = await _subscriptionService.GetConfigValueAsync("MaxReviewerConsultations");
                consultationLimit = int.TryParse(configVal, out int limit) ? limit : 5;
            }

            var userSub = new UserSubscription
            {
                UserId = input.UserId,
                SubscriptionId = input.SubscriptionId,
                StartDate = start,
                EndDate = end,
                Status = "Active",
                PaymentId = "ADMIN_GRANTED_" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper(),
                GrantedByAdminId = adminId,
                GrantedMethod = "AdminGrant",
                AdminRemarks = input.Remarks,
                UpdatedAt = DateTime.UtcNow,
                TotalReviewerConsultations = consultationLimit,
                RemainingReviewerConsultations = consultationLimit,
                LastConsultationResetDate = start
            };

            await _context.UserSubscriptions.AddAsync(userSub);
            await _context.SaveChangesAsync();

            // Log actions
            await _subscriptionService.LogSubscriptionHistoryAsync(
                input.UserId, "Granted", oldPlanName, plan.Name, adminId, input.Remarks);

            await _auditLogService.LogAsync(
                adminId, adminUser, "GrantSubscription", "UserSubscription", userSub.Id,
                $"Granted {plan.Name} to user {user.Username}. Remarks: {input.Remarks}",
                HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = $"Successfully granted '{plan.Name}' to user '{user.Username}'." });
        }

        // POST /api/admin/subscriptions/revoke
        [HttpPost("revoke")]
        public async Task<IActionResult> RevokeSubscription([FromBody] RevokeSubscriptionInput input)
        {
            var adminId = GetAdminId();
            var adminUser = GetAdminUsername();

            var user = await _context.Users.FindAsync(input.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            var active = await _subscriptionService.GetActiveSubscriptionAsync(input.UserId);
            if (active == null) return BadRequest(new { message = "User has no active subscription to revoke." });

            var planName = active.Subscription?.Name;

            active.Status = "Cancelled";
            active.EndDate = DateTime.UtcNow;
            active.UpdatedAt = DateTime.UtcNow;
            active.AdminRemarks = input.Remarks;
            active.GrantedByAdminId = adminId;

            await _context.SaveChangesAsync();

            // Log actions
            await _subscriptionService.LogSubscriptionHistoryAsync(
                input.UserId, "Revoked", planName, "Free/None", adminId, input.Remarks);

            await _auditLogService.LogAsync(
                adminId, adminUser, "RevokeSubscription", "UserSubscription", active.Id,
                $"Revoked {planName} from user {user.Username}. Remarks: {input.Remarks}",
                HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = $"Subscription revoked for user '{user.Username}'." });
        }

        // POST /api/admin/subscriptions/extend
        [HttpPost("extend")]
        public async Task<IActionResult> ExtendSubscription([FromBody] ModifySubscriptionDurationInput input)
        {
            if (input.Days <= 0) return BadRequest(new { message = "Extension days must be greater than zero." });

            if (input.Days <= 0) return BadRequest(new { message = "Extension days must be greater than zero." });

            var adminId = GetAdminId();
            var adminUser = GetAdminUsername();

            var user = await _context.Users.FindAsync(input.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            var active = await _subscriptionService.GetActiveSubscriptionAsync(input.UserId);
            if (active == null) return BadRequest(new { message = "User has no active subscription to extend." });

            if (active.EndDate == DateTime.MaxValue)
            {
                return BadRequest(new { message = "User has lifetime subscription; cannot extend duration." });
            }

            var planName = active.Subscription?.Name;
            var oldEndDate = active.EndDate;
            active.EndDate = active.EndDate.AddDays(input.Days);
            active.UpdatedAt = DateTime.UtcNow;
            active.AdminRemarks = input.Remarks;
            active.GrantedByAdminId = adminId;

            await _context.SaveChangesAsync();

            // Log actions
            await _subscriptionService.LogSubscriptionHistoryAsync(
                input.UserId, "Extended", planName, planName, adminId, $"Extended by {input.Days} days. Remarks: {input.Remarks}");

            await _auditLogService.LogAsync(
                adminId, adminUser, "ExtendSubscription", "UserSubscription", active.Id,
                $"Extended subscription for {user.Username} by {input.Days} days. End Date changed from {oldEndDate:yyyy-MM-dd} to {active.EndDate:yyyy-MM-dd}. Remarks: {input.Remarks}",
                HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = $"Subscription extended by {input.Days} days for user '{user.Username}'." });
        }

        // POST /api/admin/subscriptions/shorten
        [HttpPost("shorten")]
        public async Task<IActionResult> ShortenSubscription([FromBody] ModifySubscriptionDurationInput input)
        {
            if (input.Days <= 0) return BadRequest(new { message = "Shorten days must be greater than zero." });

            var adminId = GetAdminId();
            var adminUser = GetAdminUsername();

            var user = await _context.Users.FindAsync(input.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            var active = await _subscriptionService.GetActiveSubscriptionAsync(input.UserId);
            if (active == null) return BadRequest(new { message = "User has no active subscription to shorten." });

            if (active.EndDate == DateTime.MaxValue)
            {
                return BadRequest(new { message = "User has lifetime subscription; cannot shorten duration." });
            }

            var planName = active.Subscription?.Name;
            var oldEndDate = active.EndDate;

            active.EndDate = active.EndDate.AddDays(-input.Days);
            active.UpdatedAt = DateTime.UtcNow;
            active.AdminRemarks = input.Remarks;
            active.GrantedByAdminId = adminId;

            if (active.EndDate <= DateTime.UtcNow)
            {
                active.Status = "Cancelled";
                active.EndDate = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            // Log actions
            await _subscriptionService.LogSubscriptionHistoryAsync(
                input.UserId, "Shortened", planName, planName, adminId, $"Shortened by {input.Days} days. Remarks: {input.Remarks}");

            await _auditLogService.LogAsync(
                adminId, adminUser, "ShortenSubscription", "UserSubscription", active.Id,
                $"Shortened subscription for {user.Username} by {input.Days} days. New End Date: {active.EndDate:yyyy-MM-dd}. Remarks: {input.Remarks}",
                HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = $"Subscription shortened by {input.Days} days for user '{user.Username}'." });
        }

        // POST /api/admin/subscriptions/change-plan
        [HttpPost("change-plan")]
        public async Task<IActionResult> ChangePlan([FromBody] GrantSubscriptionInput input)
        {
            var adminId = GetAdminId();
            var adminUser = GetAdminUsername();

            var user = await _context.Users.FindAsync(input.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            var plan = await _context.Subscriptions.FindAsync(input.SubscriptionId);
            if (plan == null) return NotFound(new { message = "Subscription plan not found." });

            if (plan.UserRole != user.Role && user.Role != UserRoles.Admin)
            {
                return BadRequest(new { message = $"Plan role '{plan.UserRole}' does not match user role '{user.Role}'." });
            }

            var active = await _subscriptionService.GetActiveSubscriptionAsync(input.UserId);
            if (active == null)
            {
                // Fallback to normal grant
                return await GrantSubscription(input);
            }

            var oldPlanName = active.Subscription?.Name;

            // Deactivate
            active.Status = "Cancelled";
            active.EndDate = DateTime.UtcNow;
            active.UpdatedAt = DateTime.UtcNow;

            var start = DateTime.UtcNow;
            var end = plan.DurationInDays >= 9999 ? DateTime.MaxValue : start.AddDays(plan.DurationInDays);

            bool isPremium = plan.Name.Contains("Premium");
            int consultationLimit = 0;
            if (isPremium)
            {
                var configVal = await _subscriptionService.GetConfigValueAsync("MaxReviewerConsultations");
                consultationLimit = int.TryParse(configVal, out int limit) ? limit : 5;
            }

            var userSub = new UserSubscription
            {
                UserId = input.UserId,
                SubscriptionId = input.SubscriptionId,
                StartDate = start,
                EndDate = end,
                Status = "Active",
                PaymentId = "ADMIN_GRANT_PLAN_CHANGE_" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper(),
                GrantedByAdminId = adminId,
                GrantedMethod = "AdminGrant",
                AdminRemarks = input.Remarks,
                UpdatedAt = DateTime.UtcNow,
                TotalReviewerConsultations = consultationLimit,
                RemainingReviewerConsultations = consultationLimit,
                LastConsultationResetDate = start
            };

            await _context.UserSubscriptions.AddAsync(userSub);
            await _context.SaveChangesAsync();

            // Log actions
            await _subscriptionService.LogSubscriptionHistoryAsync(
                input.UserId, "PlanChanged", oldPlanName, plan.Name, adminId, input.Remarks);

            await _auditLogService.LogAsync(
                adminId, adminUser, "ChangeSubscriptionPlan", "UserSubscription", userSub.Id,
                $"Changed subscription for {user.Username} from {oldPlanName} to {plan.Name}. Remarks: {input.Remarks}",
                HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = $"Plan changed successfully to '{plan.Name}' for user '{user.Username}'." });
        }

        // POST /api/admin/subscriptions/suspend
        [HttpPost("suspend")]
        public async Task<IActionResult> SuspendSubscription([FromBody] RevokeSubscriptionInput input)
        {
            var adminId = GetAdminId();
            var adminUser = GetAdminUsername();

            var user = await _context.Users.FindAsync(input.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            var active = await _subscriptionService.GetActiveSubscriptionAsync(input.UserId);
            if (active == null) return BadRequest(new { message = "User has no active subscription to suspend." });

            if (active.Status == "Suspended")
            {
                return BadRequest(new { message = "Subscription is already suspended." });
            }

            var planName = active.Subscription?.Name;
            active.Status = "Suspended";
            active.UpdatedAt = DateTime.UtcNow;
            active.AdminRemarks = input.Remarks;
            active.GrantedByAdminId = adminId;

            await _context.SaveChangesAsync();

            // Log actions
            await _subscriptionService.LogSubscriptionHistoryAsync(
                input.UserId, "Suspended", planName, planName, adminId, input.Remarks);

            await _auditLogService.LogAsync(
                adminId, adminUser, "SuspendSubscription", "UserSubscription", active.Id,
                $"Suspended {planName} for user {user.Username}. Remarks: {input.Remarks}",
                HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = $"Subscription suspended for user '{user.Username}'." });
        }

        // POST /api/admin/subscriptions/reactivate
        [HttpPost("reactivate")]
        public async Task<IActionResult> ReactivateSubscription([FromBody] RevokeSubscriptionInput input)
        {
            var adminId = GetAdminId();
            var adminUser = GetAdminUsername();

            var user = await _context.Users.FindAsync(input.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            var suspended = await _context.UserSubscriptions
                .Include(us => us.Subscription)
                .Where(us => us.UserId == input.UserId && us.Status == "Suspended" && us.EndDate > DateTime.UtcNow)
                .FirstOrDefaultAsync();

            if (suspended == null) return BadRequest(new { message = "User has no suspended active-eligible subscription to reactivate." });

            var planName = suspended.Subscription?.Name;
            suspended.Status = "Active";
            suspended.UpdatedAt = DateTime.UtcNow;
            suspended.AdminRemarks = input.Remarks;
            suspended.GrantedByAdminId = adminId;

            await _context.SaveChangesAsync();

            // Log actions
            await _subscriptionService.LogSubscriptionHistoryAsync(
                input.UserId, "Reactivated", planName, planName, adminId, input.Remarks);

            await _auditLogService.LogAsync(
                adminId, adminUser, "ReactivateSubscription", "UserSubscription", suspended.Id,
                $"Reactivated {planName} for user {user.Username}. Remarks: {input.Remarks}",
                HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = $"Subscription reactivated for user '{user.Username}'." });
        }

        // GET /api/admin/subscriptions/history/{userId}
        [HttpGet("history/{userId}")]
        public async Task<IActionResult> GetUserSubscriptionHistory(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            var history = await _context.SubscriptionHistories
                .Include(h => h.ChangedByAdmin)
                .Where(h => h.UserId == userId)
                .OrderByDescending(h => h.CreatedAt)
                .Select(h => new
                {
                    h.Id,
                    h.Action,
                    h.OldPlan,
                    h.NewPlan,
                    h.Reason,
                    h.CreatedAt,
                    ChangedByAdminName = h.ChangedByAdmin != null ? h.ChangedByAdmin.FullName : "System/Payment"
                })
                .ToListAsync();

            return Ok(history);
        }

        // GET /api/admin/subscriptions/config
        [HttpGet("config")]
        public async Task<IActionResult> GetConfig()
        {
            var configs = await _subscriptionService.GetAllConfigAsync();
            return Ok(configs);
        }

        // PUT /api/admin/subscriptions/config
        [HttpPut("config")]
        public async Task<IActionResult> UpdateConfig([FromBody] PlatformConfigInput input)
        {
            if (string.IsNullOrWhiteSpace(input.Key) || string.IsNullOrWhiteSpace(input.Value))
            {
                return BadRequest(new { message = "Key and Value are required." });
            }

            var adminId = GetAdminId();
            var adminUser = GetAdminUsername();

            await _subscriptionService.SetConfigValueAsync(input.Key, input.Value, adminId);

            await _auditLogService.LogAsync(
                adminId, adminUser, "UpdatePlatformConfig", "PlatformConfig", null,
                $"Updated platform configuration key '{input.Key}' to value '{input.Value}'.",
                HttpContext.Connection.RemoteIpAddress?.ToString());

            return Ok(new { message = $"Config '{input.Key}' updated successfully." });
        }
    }

    public class GrantSubscriptionInput
    {
        public int UserId { get; set; }
        public int SubscriptionId { get; set; }
        public string? Remarks { get; set; }
    }

    public class RevokeSubscriptionInput
    {
        public int UserId { get; set; }
        public string? Remarks { get; set; }
    }

    public class ModifySubscriptionDurationInput
    {
        public int UserId { get; set; }
        public int Days { get; set; }
        public string? Remarks { get; set; }
    }

    public class PlatformConfigInput
    {
        public string Key { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }
}
