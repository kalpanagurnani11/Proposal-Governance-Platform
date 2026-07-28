using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class DiscussionMessage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int DiscussionId { get; set; }

        [ForeignKey("DiscussionId")]
        public Discussion? Discussion { get; set; }

        [Required]
        public int SenderId { get; set; }

        [ForeignKey("SenderId")]
        public User? Sender { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string MessageType { get; set; } = "text"; // "text", "question", "file", "meeting_request"

        public string? FileUrl { get; set; }

        public DateTime? ProposedTime { get; set; }

        public string? MeetingLink { get; set; }

        [MaxLength(50)]
        public string? MeetingStatus { get; set; } // "Pending", "Accepted", "Declined"

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
