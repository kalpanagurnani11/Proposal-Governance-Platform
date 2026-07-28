using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class InvestorInterest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int InvestorId { get; set; }

        [ForeignKey("InvestorId")]
        public User? Investor { get; set; }

        [Required]
        public int ProposalId { get; set; }

        [ForeignKey("ProposalId")]
        public Proposal? Proposal { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
