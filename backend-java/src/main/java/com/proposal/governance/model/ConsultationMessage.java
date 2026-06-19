package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "ConsultationMessages")
public class ConsultationMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer consultationId;

    @jakarta.persistence.Transient

    private ConsultationRequest consultation;

    @Column(nullable = false)
    private Integer senderId;

    @jakarta.persistence.Transient

    private User sender;

    private String content;

    @Column(length = 500)
    private String fileUrl;

    @Column(length = 50)
    private String fileType;

    @Column(length = 200)
    private String fileName;

    private Boolean isRead;

    private LocalDateTime sentAt;

    public ConsultationMessage() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getConsultationId() { return consultationId; }
    public void setConsultationId(Integer consultationId) { this.consultationId = consultationId; }
    public ConsultationRequest getConsultation() { return consultation; }
    public void setConsultation(ConsultationRequest consultation) { this.consultation = consultation; }
    public Integer getSenderId() { return senderId; }
    public void setSenderId(Integer senderId) { this.senderId = senderId; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead; }
    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
}