using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class Discussion
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProposalId { get; set; }

        [ForeignKey("ProposalId")]
        public Proposal? Proposal { get; set; }

        [Required]
        public int InvestorId { get; set; }

        [ForeignKey("InvestorId")]
        public User? Investor { get; set; }

        [Required]
        public int SubmitterId { get; set; }

        [ForeignKey("SubmitterId")]
        public User? Submitter { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;
    }
}
