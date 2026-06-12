package com.proposal.governance.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Proposals")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Proposal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal requestedAmount;

    @Column(precision = 18, scale = 2)
    private BigDecimal approvedAmount;

    @Column(nullable = false, length = 50)
    private String status; // "Draft", "Submitted", "UnderReview", etc.

    @Column(nullable = false, length = 100)
    private String startupName;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String problemStatement;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String proposedStatement;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal equityOffered;

    private String businessModel;

    private String industry;

    private String category;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String teamDetails;

    private String demoVideoUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitterId", nullable = false)
    @jakarta.persistence.Transient
    private User submitter;

    private String supportingDocumentPath;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public static class ProposalStatuses {
        public static final String DRAFT = "Draft";
        public static final String SUBMITTED = "Submitted";
        public static final String UNDER_REVIEW = "UnderReview";
        public static final String REVIEWED = "Reviewed";
        public static final String APPROVED = "Approved";
        public static final String REJECTED = "Rejected";
        public static final String FUND_ALLOCATED = "FundAllocated";
        public static final String ACTIVE = "Active";
        public static final String COMPLETED = "Completed";
        public static final String TERMINATED = "Terminated";
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public BigDecimal getRequestedAmount() { return requestedAmount; }
    public void setRequestedAmount(BigDecimal requestedAmount) { this.requestedAmount = requestedAmount; }
    public BigDecimal getApprovedAmount() { return approvedAmount; }
    public void setApprovedAmount(BigDecimal approvedAmount) { this.approvedAmount = approvedAmount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getStartupName() { return startupName; }
    public void setStartupName(String startupName) { this.startupName = startupName; }
    public String getProblemStatement() { return problemStatement; }
    public void setProblemStatement(String problemStatement) { this.problemStatement = problemStatement; }
    public String getProposedStatement() { return proposedStatement; }
    public void setProposedStatement(String proposedStatement) { this.proposedStatement = proposedStatement; }
    public BigDecimal getEquityOffered() { return equityOffered; }
    public void setEquityOffered(BigDecimal equityOffered) { this.equityOffered = equityOffered; }
    public String getBusinessModel() { return businessModel; }
    public void setBusinessModel(String businessModel) { this.businessModel = businessModel; }
    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getTeamDetails() { return teamDetails; }
    public void setTeamDetails(String teamDetails) { this.teamDetails = teamDetails; }
    public String getDemoVideoUrl() { return demoVideoUrl; }
    public void setDemoVideoUrl(String demoVideoUrl) { this.demoVideoUrl = demoVideoUrl; }
    public User getSubmitter() { return submitter; }
    public void setSubmitter(User submitter) { this.submitter = submitter; }
    public String getSupportingDocumentPath() { return supportingDocumentPath; }
    public void setSupportingDocumentPath(String supportingDocumentPath) { this.supportingDocumentPath = supportingDocumentPath; }
}
