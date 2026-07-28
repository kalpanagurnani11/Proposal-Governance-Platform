using System;
using System.ComponentModel.DataAnnotations;

namespace ProposalGovernance.Api.Models
{
    public class ProposalComment
    {
        [Key]
        public int Id { get; set; }

        public int ProposalId { get; set; }
        public Proposal? Proposal { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Content { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
