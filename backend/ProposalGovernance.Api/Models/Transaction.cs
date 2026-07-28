using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class Transaction
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int CapitalAllocationId { get; set; }

        [ForeignKey("CapitalAllocationId")]
        public CapitalAllocation? CapitalAllocation { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = string.Empty; // "Allocation", "Drawdown"

        [Required]
        [MaxLength(250)]
        public string Description { get; set; } = string.Empty;

        public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    }

    public static class TransactionTypes
    {
        public const string Allocation = "Allocation";
        public const string Drawdown = "Drawdown";
    }
}
