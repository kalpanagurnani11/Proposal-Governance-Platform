package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "DocumentDownloads")
public class DocumentDownload {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer proposalId;

    @jakarta.persistence.Transient

    private Proposal proposal;

    @Column(nullable = false)
    private Integer userId;

    @jakarta.persistence.Transient

    private User user;

    @Column(nullable = false, length = 200)
    private String documentType;

    @Column(nullable = false, length = 500)
    private String documentName;

    @Column(nullable = false)
    private LocalDateTime downloadedAt;

    @Column(nullable = false, length = 500)
    private String watermarkText;

    @Column(length = 45)
    private String ipAddress;

    public DocumentDownload() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getProposalId() { return proposalId; }
    public void setProposalId(Integer proposalId) { this.proposalId = proposalId; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }
    public String getDocumentName() { return documentName; }
    public void setDocumentName(String documentName) { this.documentName = documentName; }
    public LocalDateTime getDownloadedAt() { return downloadedAt; }
    public void setDownloadedAt(LocalDateTime downloadedAt) { this.downloadedAt = downloadedAt; }
    public String getWatermarkText() { return watermarkText; }
    public void setWatermarkText(String watermarkText) { this.watermarkText = watermarkText; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}