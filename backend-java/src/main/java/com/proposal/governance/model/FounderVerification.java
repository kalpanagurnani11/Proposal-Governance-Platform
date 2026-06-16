FATAL_SYNTAX_ERROR_WIP_CRASH{[]};
package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "FounderVerifications")
public class FounderVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer userId;

    @jakarta.persistence.Transient

    private User user;

    @Column(nullable = false, length = 20)
    private String verificationLevel;

    private Boolean emailVerified;

    private Boolean mobileVerified;

    private Boolean panVerified;

    @Column(length = 20)
    private String panNumber;

    private Boolean aadhaarVerified;

    @Column(length = 20)
    private String aadhaarNumber;

    private Boolean linkedInVerified;

    @Column(length = 500)
    private String linkedInUrl;

    private Boolean gstVerified;

    @Column(length = 20)
    private String gstNumber;

    private Boolean companyRegVerified;

    @Column(length = 100)
    private String registrationNumber;

    private Boolean cinVerified;

    @Column(length = 30)
    private String cinNumber;

    @Column(length = 500)
    private String documentUrl;

    @Column(nullable = false, length = 20)
    private String status;

    private Integer checkedById;

    @jakarta.persistence.Transient

    private User checkedBy;

    private LocalDateTime checkedAt;

    private String notes;

    public FounderVerification() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getVerificationLevel() { return verificationLevel; }
    public void setVerificationLevel(String verificationLevel) { this.verificationLevel = verificationLevel; }
    public Boolean getEmailVerified() { return emailVerified; }
    public void setEmailVerified(Boolean emailVerified) { this.emailVerified = emailVerified; }
    public Boolean getMobileVerified() { return mobileVerified; }
    public void setMobileVerified(Boolean mobileVerified) { this.mobileVerified = mobileVerified; }
    public Boolean getPanVerified() { return panVerified; }
    public void setPanVerified(Boolean panVerified) { this.panVerified = panVerified; }
    public String getPanNumber() { return panNumber; }
    public void setPanNumber(String panNumber) { this.panNumber = panNumber; }
    public Boolean getAadhaarVerified() { return aadhaarVerified; }
    public void setAadhaarVerified(Boolean aadhaarVerified) { this.aadhaarVerified = aadhaarVerified; }
    public String getAadhaarNumber() { return aadhaarNumber; }
    public void setAadhaarNumber(String aadhaarNumber) { this.aadhaarNumber = aadhaarNumber; }
    public Boolean getLinkedInVerified() { return linkedInVerified; }
    public void setLinkedInVerified(Boolean linkedInVerified) { this.linkedInVerified = linkedInVerified; }
    public String getLinkedInUrl() { return linkedInUrl; }
    public void setLinkedInUrl(String linkedInUrl) { this.linkedInUrl = linkedInUrl; }
    public Boolean getGstVerified() { return gstVerified; }
    public void setGstVerified(Boolean gstVerified) { this.gstVerified = gstVerified; }
    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }
    public Boolean getCompanyRegVerified() { return companyRegVerified; }
    public void setCompanyRegVerified(Boolean companyRegVerified) { this.companyRegVerified = companyRegVerified; }
    public String getRegistrationNumber() { return registrationNumber; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }
    public Boolean getCinVerified() { return cinVerified; }
    public void setCinVerified(Boolean cinVerified) { this.cinVerified = cinVerified; }
    public String getCinNumber() { return cinNumber; }
    public void setCinNumber(String cinNumber) { this.cinNumber = cinNumber; }
    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getCheckedById() { return checkedById; }
    public void setCheckedById(Integer checkedById) { this.checkedById = checkedById; }
    public User getCheckedBy() { return checkedBy; }
    public void setCheckedBy(User checkedBy) { this.checkedBy = checkedBy; }
    public LocalDateTime getCheckedAt() { return checkedAt; }
    public void setCheckedAt(LocalDateTime checkedAt) { this.checkedAt = checkedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
