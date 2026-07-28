using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class StartupTrustScore
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StartupId { get; set; } // Linked to Proposal

        [ForeignKey("StartupId")]
        public Proposal? Startup { get; set; }

        [Range(0, 100)]
        public int TrustScore { get; set; }

        [Required]
        [MaxLength(20)]
        public string TrustLevel { get; set; } = "Moderate"; // "Excellent", "Good", "Moderate", "High Risk"

        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

        public string? BreakdownJson { get; set; } // Factors and their individual weights/contributions
    }
}
