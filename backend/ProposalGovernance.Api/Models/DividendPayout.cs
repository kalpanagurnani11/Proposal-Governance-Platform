using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class DividendPayout
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProposalId { get; set; }

        [ForeignKey("ProposalId")]
        public Proposal? Proposal { get; set; }

        [Required]
        public int InvestorId { get; set; }

        [ForeignKey("InvestorId")]
        public User? Investor { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PayoutAmount { get; set; }

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal EquityPercentage { get; set; } // snapshot of equity % at payout time

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal RevenueBase { get; set; } // total revenue this payout is based on

        [MaxLength(500)]
        public string? Notes { get; set; }

        // "Pending" | "Processed" | "Cancelled"
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";

        public DateTime PayoutDate { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
