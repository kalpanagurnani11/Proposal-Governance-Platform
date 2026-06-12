package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ProposalViews")
public class ProposalView {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer proposalId;

    @jakarta.persistence.Transient

    private Proposal proposal;

    private Integer userId;

    @jakarta.persistence.Transient

    private User user;

    @Column(nullable = false)
    private LocalDateTime viewedAt;

    @Column(length = 45)
    private String ipAddress;

    public ProposalView() {}
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
    public LocalDateTime getViewedAt() { return viewedAt; }
    public void setViewedAt(LocalDateTime viewedAt) { this.viewedAt = viewedAt; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}