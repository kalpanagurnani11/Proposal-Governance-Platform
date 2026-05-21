FATAL_SYNTAX_ERROR_WIP_CRASH{[]};
package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "InvestorInterests")
public class InvestorInterest {
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

    private LocalDateTime createdAt;

    public InvestorInterest() {}
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
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
