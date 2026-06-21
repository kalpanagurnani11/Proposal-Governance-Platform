package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "StartupVerifications")
public class StartupVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer startupId;

    @jakarta.persistence.Transient

    private Proposal startup;

    @Column(length = 20)
    private String registrationCertificateStatus;

    @Column(length = 500)
    private String registrationCertificateUrl;

    @Column(length = 20)
    private String gstDocumentStatus;

    @Column(length = 500)
    private String gstDocumentUrl;

    @Column(length = 20)
    private String panDocumentStatus;

    @Column(length = 500)
    private String panDocumentUrl;

    @Column(length = 20)
    private String financialStatementsStatus;

    @Column(length = 500)
    private String financialStatementsUrl;

    @Column(length = 20)
    private String pitchDeckStatus;

    @Column(length = 500)
    private String pitchDeckUrl;

    @Column(nullable = false, length = 20)
    private String overallStatus;

    private Integer verifiedById;

    @jakarta.persistence.Transient

    private User verifiedBy;

    private LocalDateTime verifiedAt;

    private String notes;

    public StartupVerification() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getStartupId() { return startupId; }
    public void setStartupId(Integer startupId) { this.startupId = startupId; }
    public Proposal getStartup() { return startup; }
    public void setStartup(Proposal startup) { this.startup = startup; }
    public String getRegistrationCertificateStatus() { return registrationCertificateStatus; }
    public void setRegistrationCertificateStatus(String registrationCertificateStatus) { this.registrationCertificateStatus = registrationCertificateStatus; }
    public String getRegistrationCertificateUrl() { return registrationCertificateUrl; }
    public void setRegistrationCertificateUrl(String registrationCertificateUrl) { this.registrationCertificateUrl = registrationCertificateUrl; }
    public String getGstDocumentStatus() { return gstDocumentStatus; }
    public void setGstDocumentStatus(String gstDocumentStatus) { this.gstDocumentStatus = gstDocumentStatus; }
    public String getGstDocumentUrl() { return gstDocumentUrl; }
    public void setGstDocumentUrl(String gstDocumentUrl) { this.gstDocumentUrl = gstDocumentUrl; }
    public String getPanDocumentStatus() { return panDocumentStatus; }
    public void setPanDocumentStatus(String panDocumentStatus) { this.panDocumentStatus = panDocumentStatus; }
    public String getPanDocumentUrl() { return panDocumentUrl; }
    public void setPanDocumentUrl(String panDocumentUrl) { this.panDocumentUrl = panDocumentUrl; }
    public String getFinancialStatementsStatus() { return financialStatementsStatus; }
    public void setFinancialStatementsStatus(String financialStatementsStatus) { this.financialStatementsStatus = financialStatementsStatus; }
    public String getFinancialStatementsUrl() { return financialStatementsUrl; }
    public void setFinancialStatementsUrl(String financialStatementsUrl) { this.financialStatementsUrl = financialStatementsUrl; }
    public String getPitchDeckStatus() { return pitchDeckStatus; }
    public void setPitchDeckStatus(String pitchDeckStatus) { this.pitchDeckStatus = pitchDeckStatus; }
    public String getPitchDeckUrl() { return pitchDeckUrl; }
    public void setPitchDeckUrl(String pitchDeckUrl) { this.pitchDeckUrl = pitchDeckUrl; }
    public String getOverallStatus() { return overallStatus; }
    public void setOverallStatus(String overallStatus) { this.overallStatus = overallStatus; }
    public Integer getVerifiedById() { return verifiedById; }
    public void setVerifiedById(Integer verifiedById) { this.verifiedById = verifiedById; }
    public User getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(User verifiedBy) { this.verifiedBy = verifiedBy; }
    public LocalDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(LocalDateTime verifiedAt) { this.verifiedAt = verifiedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}