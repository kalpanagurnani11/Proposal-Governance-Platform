package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PatentCheckResults")
public class PatentCheckResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer startupId;

    @jakarta.persistence.Transient

    private Proposal startup;

    @Column(nullable = false, length = 20)
    private String patentRiskLevel;

    private Integer similarPatentCount;

    private BigDecimal matchPercentage;

    private LocalDateTime lastCheckedAt;

    private String detailsJson;

    public PatentCheckResult() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getStartupId() { return startupId; }
    public void setStartupId(Integer startupId) { this.startupId = startupId; }
    public Proposal getStartup() { return startup; }
    public void setStartup(Proposal startup) { this.startup = startup; }
    public String getPatentRiskLevel() { return patentRiskLevel; }
    public void setPatentRiskLevel(String patentRiskLevel) { this.patentRiskLevel = patentRiskLevel; }
    public Integer getSimilarPatentCount() { return similarPatentCount; }
    public void setSimilarPatentCount(Integer similarPatentCount) { this.similarPatentCount = similarPatentCount; }
    public BigDecimal getMatchPercentage() { return matchPercentage; }
    public void setMatchPercentage(BigDecimal matchPercentage) { this.matchPercentage = matchPercentage; }
    public LocalDateTime getLastCheckedAt() { return lastCheckedAt; }
    public void setLastCheckedAt(LocalDateTime lastCheckedAt) { this.lastCheckedAt = lastCheckedAt; }
    public String getDetailsJson() { return detailsJson; }
    public void setDetailsJson(String detailsJson) { this.detailsJson = detailsJson; }
}