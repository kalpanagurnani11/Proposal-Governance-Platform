using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class Proposal
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Department { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal RequestedAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ApprovedAmount { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = string.Empty; // "Draft", "Submitted", "UnderReview", "Reviewed", "Approved", "Rejected", "FundAllocated"

        [Required]
        public int SubmitterId { get; set; }

        [ForeignKey("SubmitterId")]
        public User? Submitter { get; set; }

        public string SupportingDocumentPath { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public static class ProposalStatuses
    {
        public const string Draft = "Draft";
        public const string Submitted = "Submitted";
        public const string UnderReview = "UnderReview";
        public const string Reviewed = "Reviewed";
        public const string Approved = "Approved";
        public const string Rejected = "Rejected";
        public const string FundAllocated = "FundAllocated";
    }
}
