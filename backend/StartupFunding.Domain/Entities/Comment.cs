namespace StartupFunding.Domain.Entities;

public class Comment
{
    public int Id { get; set; }
    public int ProposalId { get; set; }
    public int UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
