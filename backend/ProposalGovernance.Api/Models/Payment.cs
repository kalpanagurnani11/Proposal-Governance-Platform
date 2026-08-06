using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class Payment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(50)]
        public string PaymentType { get; set; } = string.Empty; // "FounderPremium", "InvestorPremium", "FeaturedStartup"

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // "Success", "Failed", "Pending"

        [Required]
        [MaxLength(100)]
        public string TransactionReference { get; set; } = string.Empty;

        [MaxLength(100)]
        public string? OrderId { get; set; }

        [MaxLength(100)]
        public string? PaymentId { get; set; }

        [MaxLength(255)]
        public string? Signature { get; set; }

        [MaxLength(50)]
        public string Gateway { get; set; } = "Razorpay";

        [MaxLength(10)]
        public string Currency { get; set; } = "INR";

        public bool Verified { get; set; } = false;

        [MaxLength(500)]
        public string? FailureReason { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
