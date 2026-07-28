using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class PatentCheckResult
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StartupId { get; set; } // Linked to Proposal

        [ForeignKey("StartupId")]
        public Proposal? Startup { get; set; }

        [Required]
        [MaxLength(20)]
        public string PatentRiskLevel { get; set; } = "Low"; // "Low", "Medium", "High"

        public int SimilarPatentCount { get; set; }

        public decimal MatchPercentage { get; set; }

        public DateTime LastCheckedAt { get; set; } = DateTime.UtcNow;

        public string? DetailsJson { get; set; }
    }
}
