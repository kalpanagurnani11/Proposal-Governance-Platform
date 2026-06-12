package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ProposalComments")
public class ProposalComment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer proposalId;

    @jakarta.persistence.Transient

    private Proposal proposal;

    private Integer userId;

    @jakarta.persistence.Transient

    private User user;

    @Column(nullable = false, length = 2000)
    private String content;

    private LocalDateTime createdAt;

    public ProposalComment() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getProposalId() { return proposalId; }
    public void setProposalId(Integer proposalId) { this.proposalId = proposalId; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}