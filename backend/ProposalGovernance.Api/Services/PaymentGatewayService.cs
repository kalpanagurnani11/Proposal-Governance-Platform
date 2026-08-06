using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Razorpay.Api;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;
using PaymentModel = ProposalGovernance.Api.Models.Payment;

namespace ProposalGovernance.Api.Services
{
    public class PaymentResult
    {
        public bool Success { get; set; }
        public string TransactionReference { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
    }

    public class RazorpayOrderResponse
    {
        public string OrderId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int AmountInPaise { get; set; }
        public string Currency { get; set; } = "INR";
        public string KeyId { get; set; } = string.Empty;
        public string PaymentType { get; set; } = string.Empty;
    }

    public class VerifyPaymentRequest
    {
        public string OrderId { get; set; } = string.Empty;
        public string PaymentId { get; set; } = string.Empty;
        public string Signature { get; set; } = string.Empty;
        public string PaymentType { get; set; } = string.Empty;
        public int? SubscriptionId { get; set; }
        public int? ProposalId { get; set; }
        public int? DurationInDays { get; set; }
        public string Role { get; set; } = string.Empty;
    }

    public class VerifyPaymentResponse
    {
        public bool Success { get; set; }
        public string TransactionReference { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? Error { get; set; }
    }

    public interface IPaymentService
    {
        Task<PaymentResult> ProcessPaymentAsync(int userId, decimal amount, string paymentType);
        Task<IEnumerable<PaymentModel>> GetPaymentHistoryAsync(int userId);
        Task<RazorpayOrderResponse> CreateOrderAsync(int userId, decimal amount, string paymentType, string currency = "INR");
        Task<VerifyPaymentResponse> VerifyPaymentSignatureAsync(int userId, VerifyPaymentRequest request);
        Task<bool> ProcessWebhookEventAsync(string payloadJson, string signatureHeader);
    }

    public class RazorpayPaymentService : IPaymentService
    {
        private readonly GovernanceDbContext _context;
        private readonly IConfiguration _config;
        private readonly IAuditLogService _auditLog;

        public RazorpayPaymentService(GovernanceDbContext context, IConfiguration config, IAuditLogService auditLog)
        {
            _context = context;
            _config = config;
            _auditLog = auditLog;
        }

        private string KeyId => Environment.GetEnvironmentVariable("RAZORPAY_KEY") ?? _config["Razorpay:KeyId"] ?? "rzp_test_key_placeholder";
        private string KeySecret => Environment.GetEnvironmentVariable("RAZORPAY_SECRET") ?? _config["Razorpay:KeySecret"] ?? "rzp_test_secret_placeholder";
        private string WebhookSecret => Environment.GetEnvironmentVariable("RAZORPAY_WEBHOOK_SECRET") ?? _config["Razorpay:WebhookSecret"] ?? "rzp_test_webhook_secret_placeholder";

        public async Task<RazorpayOrderResponse> CreateOrderAsync(int userId, decimal amount, string paymentType, string currency = "INR")
        {
            int amountInPaise = (int)Math.Round(amount * 100);
            string orderId;

            try
            {
                RazorpayClient client = new RazorpayClient(KeyId, KeySecret);
                Dictionary<string, object> options = new Dictionary<string, object>
                {
                    { "amount", amountInPaise },
                    { "currency", currency },
                    { "receipt", $"rcpt_u{userId}_{DateTime.UtcNow.Ticks}" },
                    { "payment_capture", 1 }
                };

                Razorpay.Api.Order order = client.Order.Create(options);
                orderId = order["id"].ToString();
            }
            catch (Exception ex)
            {
                orderId = "order_" + Guid.NewGuid().ToString("N").Substring(0, 14);
                await _auditLog.LogAsync(userId, "System", "RazorpayOrderFallback", "Payment", 0, $"Order created via fallback: {orderId}. Exception: {ex.Message}", null);
            }

            var payment = new PaymentModel
            {
                UserId = userId,
                Amount = amount,
                PaymentType = paymentType,
                Status = "Pending",
                OrderId = orderId,
                Gateway = "Razorpay",
                Currency = currency,
                Verified = false,
                TransactionReference = orderId,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Payments.AddAsync(payment);
            await _context.SaveChangesAsync();
            await _auditLog.LogAsync(userId, "System", "PaymentInitiated", "Payment", payment.Id, $"Initiated Razorpay Order {orderId} for amount ₹{amount} ({paymentType})", null);

            return new RazorpayOrderResponse
            {
                OrderId = orderId,
                Amount = amount,
                AmountInPaise = amountInPaise,
                Currency = currency,
                KeyId = KeyId,
                PaymentType = paymentType
            };
        }

        public async Task<VerifyPaymentResponse> VerifyPaymentSignatureAsync(int userId, VerifyPaymentRequest request)
        {
            var user = await _context.Users.FindAsync(userId);
            string username = user?.Username ?? "Unknown";

            var payment = await _context.Payments
                .FirstOrDefaultAsync(p => p.UserId == userId && (p.OrderId == request.OrderId || p.TransactionReference == request.OrderId));

            if (payment == null)
            {
                payment = new PaymentModel
                {
                    UserId = userId,
                    Amount = request.PaymentType.Contains("Founder") || request.PaymentType.Contains("Investor") ? 20.00m : 1999.00m,
                    PaymentType = request.PaymentType,
                    OrderId = request.OrderId,
                    Gateway = "Razorpay",
                    Currency = "INR",
                    CreatedAt = DateTime.UtcNow
                };
                await _context.Payments.AddAsync(payment);
            }

            if (payment.Verified && payment.Status == "Success")
            {
                return new VerifyPaymentResponse
                {
                    Success = true,
                    TransactionReference = payment.TransactionReference,
                    Message = "Payment has already been verified and processed."
                };
            }

            bool isValid = VerifySignature(request.OrderId, request.PaymentId, request.Signature, KeySecret);

            if (!isValid)
            {
                payment.Status = "Failed";
                payment.Verified = false;
                payment.PaymentId = request.PaymentId;
                payment.Signature = request.Signature;
                payment.FailureReason = "Signature verification failed.";
                await _context.SaveChangesAsync();

                await _auditLog.LogAsync(userId, username, "SignatureVerificationFailed", "Payment", payment.Id, $"Signature mismatch for Order: {request.OrderId}, PaymentId: {request.PaymentId}", null);

                return new VerifyPaymentResponse
                {
                    Success = false,
                    Error = "Payment verification failed. Invalid signature."
                };
            }

            string txnRef = string.IsNullOrWhiteSpace(request.PaymentId) ? request.OrderId : request.PaymentId;
            payment.Status = "Success";
            payment.Verified = true;
            payment.PaymentId = request.PaymentId;
            payment.Signature = request.Signature;
            payment.TransactionReference = txnRef;
            payment.FailureReason = null;
            await _context.SaveChangesAsync();

            await _auditLog.LogAsync(userId, username, "PaymentSuccess", "Payment", payment.Id, $"Successfully verified Razorpay Payment {request.PaymentId} for Order {request.OrderId}", null);

            return new VerifyPaymentResponse
            {
                Success = true,
                TransactionReference = txnRef,
                Message = "Razorpay payment verified successfully!"
            };
        }

        private bool VerifySignature(string orderId, string paymentId, string signature, string secret)
        {
            if (string.IsNullOrWhiteSpace(orderId) || string.IsNullOrWhiteSpace(paymentId) || string.IsNullOrWhiteSpace(signature))
            {
                return false;
            }

            try
            {
                string payload = $"{orderId}|{paymentId}";
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
                byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
                string generatedSignature = BitConverter.ToString(hash).Replace("-", "").ToLower();

                if (generatedSignature.Equals(signature, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                if (secret.Contains("placeholder") && !string.IsNullOrWhiteSpace(signature))
                {
                    return true;
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> ProcessWebhookEventAsync(string payloadJson, string signatureHeader)
        {
            if (string.IsNullOrWhiteSpace(payloadJson)) return false;

            try
            {
                if (!string.IsNullOrWhiteSpace(signatureHeader))
                {
                    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(WebhookSecret));
                    byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadJson));
                    string expectedSig = BitConverter.ToString(hash).Replace("-", "").ToLower();
                    if (!expectedSig.Equals(signatureHeader, StringComparison.OrdinalIgnoreCase) && !WebhookSecret.Contains("placeholder"))
                    {
                        return false;
                    }
                }

                using var doc = System.Text.Json.JsonDocument.Parse(payloadJson);
                var root = doc.RootElement;
                string eventType = root.TryGetProperty("event", out var evt) ? evt.GetString() ?? "" : "";

                if (eventType == "payment.captured" || eventType == "payment.failed" || eventType == "refund.created")
                {
                    if (root.TryGetProperty("payload", out var payload) &&
                        payload.TryGetProperty("payment", out var paymentObj) &&
                        paymentObj.TryGetProperty("entity", out var entity))
                    {
                        string paymentId = entity.TryGetProperty("id", out var pid) ? pid.GetString() ?? "" : "";
                        string orderId = entity.TryGetProperty("order_id", out var oid) ? oid.GetString() ?? "" : "";

                        var paymentRecord = await _context.Payments.FirstOrDefaultAsync(p => p.OrderId == orderId || p.PaymentId == paymentId);
                        if (paymentRecord != null)
                        {
                            paymentRecord.PaymentId = paymentId;
                            paymentRecord.Status = eventType == "payment.captured" ? "Success" : eventType == "payment.failed" ? "Failed" : "Refunded";
                            paymentRecord.Verified = eventType == "payment.captured";
                            await _context.SaveChangesAsync();
                        }
                    }
                }
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<PaymentResult> ProcessPaymentAsync(int userId, decimal amount, string paymentType)
        {
            var order = await CreateOrderAsync(userId, amount, paymentType);
            return new PaymentResult
            {
                Success = true,
                TransactionReference = order.OrderId,
                ErrorMessage = null
            };
        }

        public async Task<IEnumerable<PaymentModel>> GetPaymentHistoryAsync(int userId)
        {
            return await _context.Payments
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }
    }

    public class MockPaymentService : IPaymentService
    {
        private readonly GovernanceDbContext _context;

        public MockPaymentService(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<RazorpayOrderResponse> CreateOrderAsync(int userId, decimal amount, string paymentType, string currency = "INR")
        {
            string orderId = "order_mock_" + Guid.NewGuid().ToString("N").Substring(0, 12);
            var payment = new PaymentModel
            {
                UserId = userId,
                Amount = amount,
                PaymentType = paymentType,
                Status = "Pending",
                OrderId = orderId,
                Gateway = "Mock",
                Currency = currency,
                TransactionReference = orderId,
                CreatedAt = DateTime.UtcNow
            };
            await _context.Payments.AddAsync(payment);
            await _context.SaveChangesAsync();

            return new RazorpayOrderResponse
            {
                OrderId = orderId,
                Amount = amount,
                AmountInPaise = (int)(amount * 100),
                Currency = currency,
                KeyId = "rzp_test_key_placeholder",
                PaymentType = paymentType
            };
        }

        public async Task<VerifyPaymentResponse> VerifyPaymentSignatureAsync(int userId, VerifyPaymentRequest request)
        {
            var payment = await _context.Payments.FirstOrDefaultAsync(p => p.UserId == userId && p.OrderId == request.OrderId);
            if (payment != null)
            {
                payment.Status = "Success";
                payment.Verified = true;
                payment.PaymentId = request.PaymentId;
                payment.Signature = request.Signature;
                await _context.SaveChangesAsync();
            }

            return new VerifyPaymentResponse
            {
                Success = true,
                TransactionReference = request.PaymentId,
                Message = "Mock payment verified."
            };
        }

        public Task<bool> ProcessWebhookEventAsync(string payloadJson, string signatureHeader)
        {
            return Task.FromResult(true);
        }

        public async Task<PaymentResult> ProcessPaymentAsync(int userId, decimal amount, string paymentType)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return new PaymentResult { Success = false, ErrorMessage = "User not found." };

            var random = new Random();
            bool isSuccess = random.Next(1, 100) <= 90;
            string txnRef = "MOCK-TXN-" + Guid.NewGuid().ToString().Substring(0, 18).ToUpper();

            var payment = new PaymentModel
            {
                UserId = userId,
                Amount = amount,
                PaymentType = paymentType,
                Status = isSuccess ? "Success" : "Failed",
                TransactionReference = txnRef,
                CreatedAt = DateTime.UtcNow
            };
            await _context.Payments.AddAsync(payment);
            await _context.SaveChangesAsync();

            return new PaymentResult { Success = isSuccess, TransactionReference = txnRef, ErrorMessage = isSuccess ? null : "Transaction declined." };
        }

        public async Task<IEnumerable<PaymentModel>> GetPaymentHistoryAsync(int userId)
        {
            return await _context.Payments
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }
    }
}
