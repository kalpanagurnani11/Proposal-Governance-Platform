package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ProgressUpdates")
public class ProgressUpdate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer proposalId;

    @jakarta.persistence.Transient

    private Proposal proposal;

    @Column(nullable = false)
    private Integer authorId;

    @jakarta.persistence.Transient

    private User author;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false)
    private String content;

    @Column(length = 50)
    private String updateType;

    private BigDecimal overallProgress;

    @Column(length = 500)
    private String attachmentUrl;

    private LocalDateTime createdAt;

    public ProgressUpdate() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getProposalId() { return proposalId; }
    public void setProposalId(Integer proposalId) { this.proposalId = proposalId; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public Integer getAuthorId() { return authorId; }
    public void setAuthorId(Integer authorId) { this.authorId = authorId; }
    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getUpdateType() { return updateType; }
    public void setUpdateType(String updateType) { this.updateType = updateType; }
    public BigDecimal getOverallProgress() { return overallProgress; }
    public void setOverallProgress(BigDecimal overallProgress) { this.overallProgress = overallProgress; }
    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}