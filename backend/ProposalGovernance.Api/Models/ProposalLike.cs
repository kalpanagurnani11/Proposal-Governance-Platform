using System;

namespace ProposalGovernance.Api.Models
{
    public class ProposalLike
    {
        public int ProposalId { get; set; }
        public Proposal? Proposal { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        public DateTime LikedAt { get; set; } = DateTime.UtcNow;
    }
}
