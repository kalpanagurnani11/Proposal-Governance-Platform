using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;
using Razorpay.Api;
using Microsoft.Extensions.Configuration;

namespace ProposalGovernance.Api.Services
{
    public class PaymentResult
    {
        public bool Success { get; set; }
        public string TransactionReference { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
    }

    public interface IPaymentService
    {
        Task<PaymentResult> ProcessPaymentAsync(int userId, decimal amount, string paymentType);
        Task<IEnumerable<ProposalGovernance.Api.Models.Payment>> GetPaymentHistoryAsync(int userId);
    }

    public class MockPaymentService : IPaymentService
    {
        private readonly GovernanceDbContext _context;

        public MockPaymentService(GovernanceDbContext context)
        {
            _context = context;
        }

        public async Task<PaymentResult> ProcessPaymentAsync(int userId, decimal amount, string paymentType)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return new PaymentResult { Success = false, ErrorMessage = "User not found." };
            }

            // Simulate 90% success rate
            var random = new Random();
            bool isSuccess = random.Next(1, 100) <= 90;

            string txnRef = "MOCK-TXN-" + Guid.NewGuid().ToString().Substring(0, 18).ToUpper();

            var payment = new ProposalGovernance.Api.Models.Payment
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

            return new PaymentResult
            {
                Success = isSuccess,
                TransactionReference = txnRef,
                ErrorMessage = isSuccess ? null : "Transaction declined by simulated issuer."
            };
        }

        public async Task<IEnumerable<ProposalGovernance.Api.Models.Payment>> GetPaymentHistoryAsync(int userId)
        {
            return await _context.Payments
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }
    }

    public class RazorpayPaymentService : IPaymentService
    {
        private readonly GovernanceDbContext _context;
        private readonly IConfiguration _configuration;

        public RazorpayPaymentService(GovernanceDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<PaymentResult> ProcessPaymentAsync(int userId, decimal amount, string paymentType)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return new PaymentResult { Success = false, ErrorMessage = "User not found." };
            }

            try
            {
                string key = _configuration["Razorpay:KeyId"] ?? throw new InvalidOperationException("Razorpay Key missing");
                string secret = _configuration["Razorpay:KeySecret"] ?? throw new InvalidOperationException("Razorpay Secret missing");

                RazorpayClient client = new RazorpayClient(key, secret);
                Dictionary<string, object> options = new Dictionary<string, object>();
                
                options.Add("amount", (int)(amount * 100)); // amount in paise
                options.Add("currency", "INR");
                options.Add("receipt", "txn_" + Guid.NewGuid().ToString().Substring(0,8));
                
                Order order = client.Order.Create(options);
                string orderId = order["id"].ToString();

                var payment = new ProposalGovernance.Api.Models.Payment
                {
                    UserId = userId,
                    Amount = amount,
                    PaymentType = paymentType,
                    Status = "Order Created",
                    TransactionReference = orderId,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.Payments.AddAsync(payment);
                await _context.SaveChangesAsync();

                return new PaymentResult
                {
                    Success = true,
                    TransactionReference = orderId
                };
            }
            catch (Exception ex)
            {
                return new PaymentResult { Success = false, ErrorMessage = ex.Message };
            }
        }

        public async Task<IEnumerable<ProposalGovernance.Api.Models.Payment>> GetPaymentHistoryAsync(int userId)
        {
            return await _context.Payments
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }
    }
}
