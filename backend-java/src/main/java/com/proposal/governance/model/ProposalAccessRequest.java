package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ProposalAccessRequests")
public class ProposalAccessRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer startupId;

    @jakarta.persistence.Transient

    private Proposal startup;

    @Column(nullable = false)
    private Integer investorId;

    @jakarta.persistence.Transient

    private User investor;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    private LocalDateTime approvedAt;

    public ProposalAccessRequest() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getStartupId() { return startupId; }
    public void setStartupId(Integer startupId) { this.startupId = startupId; }
    public Proposal getStartup() { return startup; }
    public void setStartup(Proposal startup) { this.startup = startup; }
    public Integer getInvestorId() { return investorId; }
    public void setInvestorId(Integer investorId) { this.investorId = investorId; }
    public User getInvestor() { return investor; }
    public void setInvestor(User investor) { this.investor = investor; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }
}