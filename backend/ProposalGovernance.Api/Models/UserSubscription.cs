using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class UserSubscription
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        public int SubscriptionId { get; set; }

        [ForeignKey("SubscriptionId")]
        public Subscription? Subscription { get; set; }

        [Required]
        public DateTime StartDate { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime EndDate { get; set; }

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Active"; // "Active", "Expired", "Cancelled", "Suspended"

        [MaxLength(100)]
        public string? PaymentId { get; set; }

        // ── Consultation Quota (EXTENDED) ─────────────────────────────────────
        public int TotalReviewerConsultations { get; set; } = 0;
        public int RemainingReviewerConsultations { get; set; } = 0;
        public DateTime? LastConsultationResetDate { get; set; }

        // ── Admin Grant Metadata (EXTENDED) ───────────────────────────────────
        public int? GrantedByAdminId { get; set; }

        [ForeignKey("GrantedByAdminId")]
        public User? GrantedByAdmin { get; set; }

        [MaxLength(50)]
        public string GrantedMethod { get; set; } = "Payment";
        // "Payment", "AdminGrant", "Promotional", "ReviewerReward"

        public string? AdminRemarks { get; set; }

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
