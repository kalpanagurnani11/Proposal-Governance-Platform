using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class DueDiligenceReport
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StartupId { get; set; } // Reference to Proposal

        [ForeignKey("StartupId")]
        public Proposal? Startup { get; set; }

        [Required]
        public int ReviewerId { get; set; }

        [ForeignKey("ReviewerId")]
        public User? Reviewer { get; set; }

        [Range(1, 10)]
        public int InnovationScore { get; set; }

        [Range(1, 10)]
        public int MarketPotentialScore { get; set; }

        [Range(1, 10)]
        public int FeasibilityScore { get; set; }

        [Range(1, 10)]
        public int TeamStrengthScore { get; set; }

        [Range(1, 10)]
        public int FinancialReadinessScore { get; set; }

        [Range(1, 10)]
        public int RiskAssessmentScore { get; set; }

        [Range(1, 10)]
        public int PatentStrengthScore { get; set; }

        [Range(1, 10)]
        public int IpStrengthScore { get; set; }

        [Required]
        public string Summary { get; set; } = string.Empty;

        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
