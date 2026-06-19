package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Investments")
public class Investment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer investorId;

    @jakarta.persistence.Transient

    private User investor;

    @Column(nullable = false)
    private Integer proposalId;

    @jakarta.persistence.Transient

    private Proposal proposal;

    @Column(nullable = false)
    private BigDecimal committedAmount;

    @Column(length = 500)
    private String notes;

    private LocalDateTime investedAt;

    @Column(length = 50)
    private String status;

    public Investment() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getInvestorId() { return investorId; }
    public void setInvestorId(Integer investorId) { this.investorId = investorId; }
    public User getInvestor() { return investor; }
    public void setInvestor(User investor) { this.investor = investor; }
    public Integer getProposalId() { return proposalId; }
    public void setProposalId(Integer proposalId) { this.proposalId = proposalId; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public BigDecimal getCommittedAmount() { return committedAmount; }
    public void setCommittedAmount(BigDecimal committedAmount) { this.committedAmount = committedAmount; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public LocalDateTime getInvestedAt() { return investedAt; }
    public void setInvestedAt(LocalDateTime investedAt) { this.investedAt = investedAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}