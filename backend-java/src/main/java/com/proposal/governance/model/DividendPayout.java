package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "DividendPayouts")
public class DividendPayout {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer proposalId;

    @jakarta.persistence.Transient

    private Proposal proposal;

    @Column(nullable = false)
    private Integer investorId;

    @jakarta.persistence.Transient

    private User investor;

    @Column(nullable = false)
    private BigDecimal payoutAmount;

    @Column(nullable = false)
    private BigDecimal equityPercentage;

    @Column(nullable = false)
    private BigDecimal revenueBase;

    @Column(length = 500)
    private String notes;

    @Column(length = 50)
    private String status;

    private LocalDateTime payoutDate;

    private LocalDateTime createdAt;

    public DividendPayout() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getProposalId() { return proposalId; }
    public void setProposalId(Integer proposalId) { this.proposalId = proposalId; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public Integer getInvestorId() { return investorId; }
    public void setInvestorId(Integer investorId) { this.investorId = investorId; }
    public User getInvestor() { return investor; }
    public void setInvestor(User investor) { this.investor = investor; }
    public BigDecimal getPayoutAmount() { return payoutAmount; }
    public void setPayoutAmount(BigDecimal payoutAmount) { this.payoutAmount = payoutAmount; }
    public BigDecimal getEquityPercentage() { return equityPercentage; }
    public void setEquityPercentage(BigDecimal equityPercentage) { this.equityPercentage = equityPercentage; }
    public BigDecimal getRevenueBase() { return revenueBase; }
    public void setRevenueBase(BigDecimal revenueBase) { this.revenueBase = revenueBase; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getPayoutDate() { return payoutDate; }
    public void setPayoutDate(LocalDateTime payoutDate) { this.payoutDate = payoutDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}