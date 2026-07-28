using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class FounderVerification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        [MaxLength(20)]
        public string VerificationLevel { get; set; } = "Basic"; // "Basic", "Verified", "Business"

        public bool EmailVerified { get; set; } = false;
        public bool MobileVerified { get; set; } = false;

        public bool PanVerified { get; set; } = false;
        [MaxLength(20)]
        public string? PanNumber { get; set; }

        public bool AadhaarVerified { get; set; } = false;
        [MaxLength(20)]
        public string? AadhaarNumber { get; set; }

        public bool LinkedInVerified { get; set; } = false;
        [MaxLength(500)]
        public string? LinkedInUrl { get; set; }

        public bool GstVerified { get; set; } = false;
        [MaxLength(20)]
        public string? GstNumber { get; set; }

        public bool CompanyRegVerified { get; set; } = false;
        [MaxLength(100)]
        public string? RegistrationNumber { get; set; }

        public bool CinVerified { get; set; } = false;
        [MaxLength(30)]
        public string? CinNumber { get; set; }

        [MaxLength(500)]
        public string? DocumentUrl { get; set; } // Path to uploaded verification document bundle

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // "Pending", "Verified", "Rejected"

        public int? CheckedById { get; set; } // Admin who approved/rejected

        [ForeignKey("CheckedById")]
        public User? CheckedBy { get; set; }

        public DateTime? CheckedAt { get; set; }

        public string? Notes { get; set; }
    }
}
