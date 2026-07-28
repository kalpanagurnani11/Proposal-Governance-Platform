using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class Investment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int InvestorId { get; set; }

        [ForeignKey("InvestorId")]
        public User? Investor { get; set; }

        [Required]
        public int ProposalId { get; set; }

        [ForeignKey("ProposalId")]
        public Proposal? Proposal { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal CommittedAmount { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        public DateTime InvestedAt { get; set; } = DateTime.UtcNow;

        // Status: "Active" | "FullyDisbursed" | "Cancelled"
        [MaxLength(50)]
        public string Status { get; set; } = "Active";
    }

    public static class InvestmentStatuses
    {
        public const string Active = "Active";
        public const string FullyDisbursed = "FullyDisbursed";
        public const string Cancelled = "Cancelled";
    }
}
