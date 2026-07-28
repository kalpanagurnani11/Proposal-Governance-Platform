using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class Review
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProposalId { get; set; }

        [ForeignKey("ProposalId")]
        public Proposal? Proposal { get; set; }

        [Required]
        public int ReviewerId { get; set; }

        [ForeignKey("ReviewerId")]
        public User? Reviewer { get; set; }

        [Range(1, 10)]
        public int FeasibilityScore { get; set; } // 1-10

        [Range(1, 10)]
        public int StrategicScore { get; set; } // 1-10

        [Range(1, 10)]
        public int RiskScore { get; set; } // 1-10 (higher means less risk or we define 1 as high risk, 10 as low risk. Let's say 10 is excellent/least risk, 1 is highest risk)

        [Range(1, 10)]
        public int RoiScore { get; set; } // 1-10

        [Required]
        public string Comment { get; set; } = string.Empty;

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    }
}
