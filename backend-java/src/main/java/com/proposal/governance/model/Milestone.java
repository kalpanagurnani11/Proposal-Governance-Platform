package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Milestones")
public class Milestone {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer proposalId;

    @jakarta.persistence.Transient

    private Proposal proposal;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private LocalDateTime targetDate;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(length = 500)
    private String proofDocumentUrl;

    @Column(length = 500)
    private String adminNotes;

    private LocalDateTime achievedAt;

    private LocalDateTime createdAt;

    private Integer orderIndex;

    public Milestone() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getProposalId() { return proposalId; }
    public void setProposalId(Integer proposalId) { this.proposalId = proposalId; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getTargetDate() { return targetDate; }
    public void setTargetDate(LocalDateTime targetDate) { this.targetDate = targetDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getProofDocumentUrl() { return proofDocumentUrl; }
    public void setProofDocumentUrl(String proofDocumentUrl) { this.proofDocumentUrl = proofDocumentUrl; }
    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }
    public LocalDateTime getAchievedAt() { return achievedAt; }
    public void setAchievedAt(LocalDateTime achievedAt) { this.achievedAt = achievedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
}