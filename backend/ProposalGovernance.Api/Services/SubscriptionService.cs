using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

namespace ProposalGovernance.Api.Services
{
    public interface ISubscriptionService
    {
        Task<IEnumerable<Subscription>> GetAvailablePlansAsync(string role);
        Task<UserSubscription?> GetActiveSubscriptionAsync(int userId);
        Task<bool> ActivateSubscriptionAsync(int userId, int subscriptionId, string paymentReference);
        Task<bool> DeactivateSubscriptionAsync(int userId);
        Task<bool> HasPremiumAsync(int userId);

        // ── Consultation extensions ───────────────────────────────────────────
        Task<bool> HasConsultationsRemainingAsync(int userId);
        Task<int> GetRemainingConsultationsAsync(int userId);
        Task<bool> DeductConsultationAsync(int userId);
        Task ResetConsultationCountIfRenewedAsync(int userId);
        Task LogSubscriptionHistoryAsync(int userId, string action, string? oldPlan, string? newPlan, int? adminId, string? reason);

        // ── Platform config ───────────────────────────────────────────────────
        Task<string?> GetConfigValueAsync(string key);
        Task<List<PlatformConfig>> GetAllConfigAsync();
        Task SetConfigValueAsync(string key, string value, int adminId);
    }

    public class SubscriptionService : ISubscriptionService
    {
        private readonly GovernanceDbContext _context;

        public SubscriptionService(GovernanceDbContext context)
        {
            _context = context;
        }

        private async Task EnsureSubscriptionsSeededAsync()
        {
            try
            {
                if (!await _context.Subscriptions.AnyAsync())
                {
                    var defaultPlans = new List<Subscription>
                    {
                        new Subscription { Id = 1, Name = "Founder Free", UserRole = UserRoles.Founder, Price = 0.00m, DurationInDays = 9999, Description = "Standard listing and interest requests.", IsActive = true },
                        new Subscription { Id = 2, Name = "Founder Premium", UserRole = UserRoles.Founder, Price = 20.00m, DurationInDays = 30, Description = "Priority listing, visibility boost, verified badge, and priority consultation.", IsActive = true },
                        new Subscription { Id = 3, Name = "Investor Free", UserRole = UserRoles.Investor, Price = 0.00m, DurationInDays = 9999, Description = "Standard browse, view public proposals, and request access.", IsActive = true },
                        new Subscription { Id = 4, Name = "Investor Premium", UserRole = UserRoles.Investor, Price = 20.00m, DurationInDays = 30, Description = "Advanced filters, comparisons, risk reports, and trust breakdown.", IsActive = true }
                    };
                    await _context.Subscriptions.AddRangeAsync(defaultPlans);
                    await _context.SaveChangesAsync();
                }
            }
            catch
            {
                // Table might not exist yet or concurrency collision
            }
        }

        public async Task<IEnumerable<Subscription>> GetAvailablePlansAsync(string role)
        {
            await EnsureSubscriptionsSeededAsync();
            string targetRole = role == UserRoles.Admin || role == UserRoles.Reviewer ? UserRoles.Founder : role;
            string searchRole = targetRole.ToLower() == "founder" ? "founder" : targetRole.ToLower();
            return await _context.Subscriptions
                .Where(s => (s.UserRole.ToLower() == searchRole || (searchRole == "founder" && s.UserRole.ToLower() == "submitter")) && s.IsActive)
                .ToListAsync();
        }

        public async Task<UserSubscription?> GetActiveSubscriptionAsync(int userId)
        {
            return await _context.UserSubscriptions
                .Include(us => us.Subscription)
                .Where(us => us.UserId == userId && us.Status == "Active" && us.EndDate > DateTime.UtcNow)
                .OrderByDescending(us => us.EndDate)
                .FirstOrDefaultAsync();
        }

        public async Task<bool> ActivateSubscriptionAsync(int userId, int subscriptionId, string paymentReference)
        {
            var user = await _context.Users.FindAsync(userId);
            var sub = await _context.Subscriptions.FindAsync(subscriptionId);
            if (user == null || sub == null) return false;

            var existing = await GetActiveSubscriptionAsync(userId);
            string? oldPlan = existing?.Subscription?.Name;

            await DeactivateSubscriptionAsync(userId);

            var start = DateTime.UtcNow;
            var end = sub.DurationInDays >= 9999 ? DateTime.MaxValue : start.AddDays(sub.DurationInDays);

            bool isPremium = sub.Name.Contains("Premium");
            int consultationLimit = 0;
            if (isPremium)
            {
                var configVal = await GetConfigValueAsync("MaxReviewerConsultations");
                consultationLimit = int.TryParse(configVal, out int limit) ? limit : 5;
            }

            var userSub = new UserSubscription
            {
                UserId = userId,
                SubscriptionId = subscriptionId,
                StartDate = start,
                EndDate = end,
                Status = "Active",
                PaymentId = paymentReference,
                GrantedMethod = "Payment",
                UpdatedAt = DateTime.UtcNow,
                TotalReviewerConsultations = consultationLimit,
                RemainingReviewerConsultations = consultationLimit,
                LastConsultationResetDate = start
            };

            await _context.UserSubscriptions.AddAsync(userSub);
            await _context.SaveChangesAsync();

            await LogSubscriptionHistoryAsync(userId, "Purchased", oldPlan, sub.Name, null, $"Payment ref: {paymentReference}");
            return true;
        }

        public async Task<bool> DeactivateSubscriptionAsync(int userId)
        {
            var existing = await _context.UserSubscriptions
                .Where(us => us.UserId == userId && us.Status == "Active")
                .ToListAsync();

            if (!existing.Any()) return false;

            foreach (var ex in existing)
            {
                ex.Status = "Cancelled";
                ex.EndDate = DateTime.UtcNow;
                ex.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> HasPremiumAsync(int userId)
        {
            var active = await GetActiveSubscriptionAsync(userId);
            if (active == null) return false;
            return active.SubscriptionId == 2 || active.SubscriptionId == 4 || active.Subscription?.Name.Contains("Premium") == true;
        }

        // ── Consultation Quota Methods ────────────────────────────────────────

        public async Task<bool> HasConsultationsRemainingAsync(int userId)
        {
            var sub = await GetActiveSubscriptionAsync(userId);
            if (sub == null) return false;
            return sub.RemainingReviewerConsultations > 0;
        }

        public async Task<int> GetRemainingConsultationsAsync(int userId)
        {
            var sub = await GetActiveSubscriptionAsync(userId);
            return sub?.RemainingReviewerConsultations ?? 0;
        }

        public async Task<bool> DeductConsultationAsync(int userId)
        {
            var sub = await _context.UserSubscriptions
                .Where(us => us.UserId == userId && us.Status == "Active" && us.EndDate > DateTime.UtcNow)
                .OrderByDescending(us => us.EndDate)
                .FirstOrDefaultAsync();

            if (sub == null || sub.RemainingReviewerConsultations <= 0) return false;

            sub.RemainingReviewerConsultations -= 1;
            sub.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task ResetConsultationCountIfRenewedAsync(int userId)
        {
            var sub = await _context.UserSubscriptions
                .Include(us => us.Subscription)
                .Where(us => us.UserId == userId && us.Status == "Active" && us.EndDate > DateTime.UtcNow)
                .OrderByDescending(us => us.EndDate)
                .FirstOrDefaultAsync();

            if (sub == null) return;

            if (sub.LastConsultationResetDate == null || sub.LastConsultationResetDate < sub.StartDate)
            {
                var configVal = await GetConfigValueAsync("MaxReviewerConsultations");
                int limit = int.TryParse(configVal, out int l) ? l : 5;
                sub.TotalReviewerConsultations = limit;
                sub.RemainingReviewerConsultations = limit;
                sub.LastConsultationResetDate = DateTime.UtcNow;
                sub.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        // ── Subscription History ──────────────────────────────────────────────

        public async Task LogSubscriptionHistoryAsync(int userId, string action, string? oldPlan, string? newPlan, int? adminId, string? reason)
        {
            var entry = new SubscriptionHistory
            {
                UserId = userId,
                Action = action,
                OldPlan = oldPlan,
                NewPlan = newPlan,
                ChangedByAdminId = adminId,
                Reason = reason,
                CreatedAt = DateTime.UtcNow
            };
            await _context.SubscriptionHistories.AddAsync(entry);
            await _context.SaveChangesAsync();
        }

        // ── Platform Config ───────────────────────────────────────────────────

        public async Task<string?> GetConfigValueAsync(string key)
        {
            try
            {
                var config = await _context.PlatformConfigs.FirstOrDefaultAsync(c => c.Key == key);
                return config?.Value;
            }
            catch { return null; } // table may not exist yet on first run
        }

        public async Task<List<PlatformConfig>> GetAllConfigAsync()
        {
            return await _context.PlatformConfigs.OrderBy(c => c.Key).ToListAsync();
        }

        public async Task SetConfigValueAsync(string key, string value, int adminId)
        {
            var config = await _context.PlatformConfigs.FirstOrDefaultAsync(c => c.Key == key);
            if (config == null)
            {
                config = new PlatformConfig { Key = key, Value = value, UpdatedAt = DateTime.UtcNow, UpdatedByAdminId = adminId };
                await _context.PlatformConfigs.AddAsync(config);
            }
            else
            {
                config.Value = value;
                config.UpdatedAt = DateTime.UtcNow;
                config.UpdatedByAdminId = adminId;
            }
            await _context.SaveChangesAsync();
        }
    }
}
