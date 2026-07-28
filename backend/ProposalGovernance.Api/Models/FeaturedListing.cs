using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class FeaturedListing
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StartupId { get; set; } // Reference to Proposal

        [ForeignKey("StartupId")]
        public Proposal? Startup { get; set; }

        [Required]
        public int UserId { get; set; } // SubmitterId

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Active"; // "Active", "Expired"
    }
}
