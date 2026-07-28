using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProposalGovernance.Api.Models
{
    public class DocumentDownload
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProposalId { get; set; }

        [ForeignKey("ProposalId")]
        public Proposal? Proposal { get; set; }

        [Required]
        public int UserId { get; set; } // Investor ID

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [Required]
        [MaxLength(200)]
        public string DocumentType { get; set; } = string.Empty; // e.g. "PitchDeck", "FinancialReport", "PatentDocument", "ConfidentialFile"

        [Required]
        [MaxLength(500)]
        public string DocumentName { get; set; } = string.Empty;

        [Required]
        public DateTime DownloadedAt { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(500)]
        public string WatermarkText { get; set; } = string.Empty; // Name, Email, Timestamp, DocID

        [MaxLength(45)]
        public string? IpAddress { get; set; }
    }
}
