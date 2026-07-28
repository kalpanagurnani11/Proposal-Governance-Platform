using System.ComponentModel.DataAnnotations;

namespace ProposalGovernance.Api.Models
{
    public class Subscription
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string UserRole { get; set; } = string.Empty; // "Submitter", "Investor"

        [Required]
        public decimal Price { get; set; }

        [Required]
        public int DurationInDays { get; set; }

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
    }
}
