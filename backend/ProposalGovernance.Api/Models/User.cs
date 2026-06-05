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
        public string Role { get; set; } = string.Empty; // "Admin", "Reviewer", "Submitter"

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Department { get; set; } = string.Empty; // e.g. "IT", "Finance", "R&D"
    }

    public static class UserRoles
    {
        public const string Admin = "Admin";
        public const string Reviewer = "Reviewer";
        public const string Submitter = "Submitter";
    }
}
