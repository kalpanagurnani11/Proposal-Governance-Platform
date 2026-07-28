using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class Milestone
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProposalId { get; set; }

        [ForeignKey("ProposalId")]
        public Proposal? Proposal { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        public DateTime TargetDate { get; set; }

        // "Pending" | "Achieved" | "Missed"
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = MilestoneStatuses.Pending;

        [MaxLength(500)]
        public string? ProofDocumentUrl { get; set; }

        [MaxLength(500)]
        public string? AdminNotes { get; set; }

        public DateTime? AchievedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int OrderIndex { get; set; } = 0; // for ordering milestones
    }

    public static class MilestoneStatuses
    {
        public const string Pending = "Pending";
        public const string Achieved = "Achieved";
        public const string Missed = "Missed";
    }
}
