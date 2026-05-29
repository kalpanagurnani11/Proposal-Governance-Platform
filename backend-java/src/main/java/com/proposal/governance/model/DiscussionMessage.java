package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "DiscussionMessages")
public class DiscussionMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer discussionId;

    @jakarta.persistence.Transient

    private Discussion discussion;

    @Column(nullable = false)
    private Integer senderId;

    @jakarta.persistence.Transient

    private User sender;

    @Column(nullable = false)
    private String content;

    @Column(nullable = false, length = 50)
    private String messageType;

    private String fileUrl;

    private LocalDateTime proposedTime;

    private String meetingLink;

    @Column(length = 50)
    private String meetingStatus;

    private LocalDateTime createdAt;

    public DiscussionMessage() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getDiscussionId() { return discussionId; }
    public void setDiscussionId(Integer discussionId) { this.discussionId = discussionId; }
    public Discussion getDiscussion() { return discussion; }
    public void setDiscussion(Discussion discussion) { this.discussion = discussion; }
    public Integer getSenderId() { return senderId; }
    public void setSenderId(Integer senderId) { this.senderId = senderId; }
    public User getSender() { return sender; }
    public void setSender(User sender) { this.sender = sender; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public LocalDateTime getProposedTime() { return proposedTime; }
    public void setProposedTime(LocalDateTime proposedTime) { this.proposedTime = proposedTime; }
    public String getMeetingLink() { return meetingLink; }
    public void setMeetingLink(String meetingLink) { this.meetingLink = meetingLink; }
    public String getMeetingStatus() { return meetingStatus; }
    public void setMeetingStatus(String meetingStatus) { this.meetingStatus = meetingStatus; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}