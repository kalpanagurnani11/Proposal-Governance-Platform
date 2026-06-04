package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "DueDiligenceReports")
public class DueDiligenceReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer startupId;

    @jakarta.persistence.Transient

    private Proposal startup;

    @Column(nullable = false)
    private Integer reviewerId;

    @jakarta.persistence.Transient

    private User reviewer;

    private Integer innovationScore;

    private Integer marketPotentialScore;

    private Integer feasibilityScore;

    private Integer teamStrengthScore;

    private Integer financialReadinessScore;

    private Integer riskAssessmentScore;

    private Integer patentStrengthScore;

    private Integer ipStrengthScore;

    @Column(nullable = false)
    private String summary;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public DueDiligenceReport() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getStartupId() { return startupId; }
    public void setStartupId(Integer startupId) { this.startupId = startupId; }
    public Proposal getStartup() { return startup; }
    public void setStartup(Proposal startup) { this.startup = startup; }
    public Integer getReviewerId() { return reviewerId; }
    public void setReviewerId(Integer reviewerId) { this.reviewerId = reviewerId; }
    public User getReviewer() { return reviewer; }
    public void setReviewer(User reviewer) { this.reviewer = reviewer; }
    public Integer getInnovationScore() { return innovationScore; }
    public void setInnovationScore(Integer innovationScore) { this.innovationScore = innovationScore; }
    public Integer getMarketPotentialScore() { return marketPotentialScore; }
    public void setMarketPotentialScore(Integer marketPotentialScore) { this.marketPotentialScore = marketPotentialScore; }
    public Integer getFeasibilityScore() { return feasibilityScore; }
    public void setFeasibilityScore(Integer feasibilityScore) { this.feasibilityScore = feasibilityScore; }
    public Integer getTeamStrengthScore() { return teamStrengthScore; }
    public void setTeamStrengthScore(Integer teamStrengthScore) { this.teamStrengthScore = teamStrengthScore; }
    public Integer getFinancialReadinessScore() { return financialReadinessScore; }
    public void setFinancialReadinessScore(Integer financialReadinessScore) { this.financialReadinessScore = financialReadinessScore; }
    public Integer getRiskAssessmentScore() { return riskAssessmentScore; }
    public void setRiskAssessmentScore(Integer riskAssessmentScore) { this.riskAssessmentScore = riskAssessmentScore; }
    public Integer getPatentStrengthScore() { return patentStrengthScore; }
    public void setPatentStrengthScore(Integer patentStrengthScore) { this.patentStrengthScore = patentStrengthScore; }
    public Integer getIpStrengthScore() { return ipStrengthScore; }
    public void setIpStrengthScore(Integer ipStrengthScore) { this.ipStrengthScore = ipStrengthScore; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}