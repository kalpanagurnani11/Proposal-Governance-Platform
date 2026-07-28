using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class AIAssistantLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        [MaxLength(50)]
        public string UserRole { get; set; } = string.Empty; // "Submitter", "Investor"

        [Required]
        public string Prompt { get; set; } = string.Empty;

        public string? ResponseSummary { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ConsultationRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        public int? ReviewerId { get; set; }

        [ForeignKey("ReviewerId")]
        public User? Reviewer { get; set; }

        public int? StartupId { get; set; }

        [ForeignKey("StartupId")]
        public Proposal? Startup { get; set; }

        [Required]
        [MaxLength(100)]
        public string ConsultationType { get; set; } = string.Empty;
        // e.g. "TechnicalReview", "BusinessModel", "PitchPrep", "InvestmentAnalysis", "General"

        [Required]
        [MaxLength(200)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending";
        // "Pending", "Accepted", "InProgress", "Completed", "Rejected", "Cancelled"

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        public DateTime? AcceptedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        public int? Rating { get; set; } // 1–5
        public string? Feedback { get; set; }
    }

    public class ConsultationMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ConsultationId { get; set; }

        [ForeignKey("ConsultationId")]
        public ConsultationRequest? Consultation { get; set; }

        [Required]
        public int SenderId { get; set; }

        [ForeignKey("SenderId")]
        public User? Sender { get; set; }

        public string? Content { get; set; }

        [MaxLength(500)]
        public string? FileUrl { get; set; }

        [MaxLength(50)]
        public string? FileType { get; set; } // "pdf", "image", "doc"

        [MaxLength(200)]
        public string? FileName { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }

    public class SubscriptionHistory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;
        // "Granted", "Revoked", "Extended", "Shortened", "Suspended", "Reactivated", "PlanChanged", "Purchased", "Cancelled"

        [MaxLength(100)]
        public string? OldPlan { get; set; }

        [MaxLength(100)]
        public string? NewPlan { get; set; }

        public int? ChangedByAdminId { get; set; }

        [ForeignKey("ChangedByAdminId")]
        public User? ChangedByAdmin { get; set; }

        public string? Reason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class PlatformConfig
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Key { get; set; } = string.Empty;

        [Required]
        public string Value { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Description { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public int? UpdatedByAdminId { get; set; }
    }
}
