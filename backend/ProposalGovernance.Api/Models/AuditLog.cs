using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class AuditLog
    {
        [Key]
        public int Id { get; set; }

        public int? UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [MaxLength(100)]
        public string? Username { get; set; }

        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty; // "ViewProposal", "RequestAccess", "AcceptNda", "DownloadDocument", "SubmitVerification", "ReviewDecision", "PatentCheck"

        [MaxLength(100)]
        public string? EntityName { get; set; }

        public int? EntityId { get; set; }

        public string? Details { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(45)]
        public string? IpAddress { get; set; }
    }
}
