using System;
using System.ComponentModel.DataAnnotations;

namespace ProposalGovernance.Api.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty; // "Admin", "Reviewer", "Founder", "Investor"

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string ContactNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Department { get; set; } = string.Empty; // e.g. "IT", "Finance", "R&D"

        [MaxLength(100)]
        public string? PatentId { get; set; }

        [MaxLength(50)]
        public string? PatentVerificationStatus { get; set; } // null, "Unverified", "Verified", "VerificationFailed"

        public string? PatentDetailsJson { get; set; }
    }

    public static class UserRoles
    {
        public const string Admin = "Admin";
        public const string Reviewer = "Reviewer";
        public const string Submitter = "Founder";
        public const string Founder = "Founder";
        public const string Investor = "Investor";
    }
}
