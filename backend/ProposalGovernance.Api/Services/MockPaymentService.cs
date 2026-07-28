using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ProposalGovernance.Api.Data;
using ProposalGovernance.Api.Models;

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
        Task<IEnumerable<Payment>> GetPaymentHistoryAsync(int userId);
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

            var payment = new Payment
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

        public async Task<IEnumerable<Payment>> GetPaymentHistoryAsync(int userId)
        {
            return await _context.Payments
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }
    }

    // Future Razorpay Payment Service placeholder
    public class FutureRazorpayPaymentService : IPaymentService
    {
        public Task<PaymentResult> ProcessPaymentAsync(int userId, decimal amount, string paymentType)
        {
            throw new NotImplementedException("Razorpay integration is planned for production release.");
        }

        public Task<IEnumerable<Payment>> GetPaymentHistoryAsync(int userId)
        {
            throw new NotImplementedException("Razorpay integration is planned for production release.");
        }
    }
}
