using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class NDAAgreement
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StartupId { get; set; } // Reference to Proposal

        [ForeignKey("StartupId")]
        public Proposal? Startup { get; set; }

        [Required]
        public int InvestorId { get; set; }

        [ForeignKey("InvestorId")]
        public User? Investor { get; set; }

        [Required]
        public DateTime AcceptedAt { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(45)]
        public string IpAddress { get; set; } = string.Empty;

        [Required]
        [MaxLength(10)]
        public string Version { get; set; } = "1.0";
    }
}
