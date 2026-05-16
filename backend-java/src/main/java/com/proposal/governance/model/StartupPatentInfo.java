package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "StartupPatentInfos")
public class StartupPatentInfo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer startupId;

    @jakarta.persistence.Transient

    private Proposal startup;

    @Column(nullable = false, length = 50)
    private String patentStatus;

    @Column(length = 100)
    private String patentNumber;

    private LocalDateTime filingDate;

    @Column(length = 500)
    private String patentDocumentUrl;

    private LocalDateTime lastCheckedAt;

    @Column(length = 50)
    private String verificationStatus;

    private Integer verifiedById;

    @jakarta.persistence.Transient

    private User verifiedBy;

    public StartupPatentInfo() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getStartupId() { return startupId; }
    public void setStartupId(Integer startupId) { this.startupId = startupId; }
    public Proposal getStartup() { return startup; }
    public void setStartup(Proposal startup) { this.startup = startup; }
    public String getPatentStatus() { return patentStatus; }
    public void setPatentStatus(String patentStatus) { this.patentStatus = patentStatus; }
    public String getPatentNumber() { return patentNumber; }
    public void setPatentNumber(String patentNumber) { this.patentNumber = patentNumber; }
    public LocalDateTime getFilingDate() { return filingDate; }
    public void setFilingDate(LocalDateTime filingDate) { this.filingDate = filingDate; }
    public String getPatentDocumentUrl() { return patentDocumentUrl; }
    public void setPatentDocumentUrl(String patentDocumentUrl) { this.patentDocumentUrl = patentDocumentUrl; }
    public LocalDateTime getLastCheckedAt() { return lastCheckedAt; }
    public void setLastCheckedAt(LocalDateTime lastCheckedAt) { this.lastCheckedAt = lastCheckedAt; }
    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }
    public Integer getVerifiedById() { return verifiedById; }
    public void setVerifiedById(Integer verifiedById) { this.verifiedById = verifiedById; }
    public User getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(User verifiedBy) { this.verifiedBy = verifiedBy; }
}