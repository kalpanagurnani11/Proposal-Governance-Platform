using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class StartupPatentInfo
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StartupId { get; set; } // Linked to Proposal

        [ForeignKey("StartupId")]
        public Proposal? Startup { get; set; }

        [Required]
        [MaxLength(50)]
        public string PatentStatus { get; set; } = "NoPatent"; // "NoPatent", "PatentDrafted", "PatentFiled", "PatentPending", "PatentGranted"

        [MaxLength(100)]
        public string? PatentNumber { get; set; }

        public DateTime? FilingDate { get; set; }

        [MaxLength(500)]
        public string? PatentDocumentUrl { get; set; }

        public DateTime LastCheckedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string VerificationStatus { get; set; } = "Pending"; // "Pending", "Verified", "Rejected"

        public int? VerifiedById { get; set; } // Reviewer/Admin who verified it

        [ForeignKey("VerifiedById")]
        public User? VerifiedBy { get; set; }
    }
}
