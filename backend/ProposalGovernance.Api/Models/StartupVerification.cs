using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class StartupVerification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StartupId { get; set; } // Linked to Proposal

        [ForeignKey("StartupId")]
        public Proposal? Startup { get; set; }

        // Documents verification status
        [MaxLength(20)]
        public string RegistrationCertificateStatus { get; set; } = "Pending"; // "Pending", "Verified", "Rejected"
        [MaxLength(500)]
        public string? RegistrationCertificateUrl { get; set; }

        [MaxLength(20)]
        public string GstDocumentStatus { get; set; } = "Pending";
        [MaxLength(500)]
        public string? GstDocumentUrl { get; set; }

        [MaxLength(20)]
        public string PanDocumentStatus { get; set; } = "Pending";
        [MaxLength(500)]
        public string? PanDocumentUrl { get; set; }

        [MaxLength(20)]
        public string FinancialStatementsStatus { get; set; } = "Pending";
        [MaxLength(500)]
        public string? FinancialStatementsUrl { get; set; }

        [MaxLength(20)]
        public string PitchDeckStatus { get; set; } = "Pending";
        [MaxLength(500)]
        public string? PitchDeckUrl { get; set; }

        [Required]
        [MaxLength(20)]
        public string OverallStatus { get; set; } = "Pending"; // "Pending", "Verified", "Rejected"

        public int? VerifiedById { get; set; }

        [ForeignKey("VerifiedById")]
        public User? VerifiedBy { get; set; }

        public DateTime? VerifiedAt { get; set; }

        public string? Notes { get; set; }
    }
}
