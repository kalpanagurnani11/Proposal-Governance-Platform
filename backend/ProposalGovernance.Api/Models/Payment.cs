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

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
