package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "UserSubscriptions")
public class UserSubscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer userId;

    @jakarta.persistence.Transient

    private User user;

    @Column(nullable = false)
    private Integer subscriptionId;

    @jakarta.persistence.Transient

    private Subscription subscription;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(length = 100)
    private String paymentId;

    private Integer totalReviewerConsultations;

    private Integer remainingReviewerConsultations;

    private LocalDateTime lastConsultationResetDate;

    private Integer grantedByAdminId;

    @jakarta.persistence.Transient

    private User grantedByAdmin;

    @Column(length = 50)
    private String grantedMethod;

    private String adminRemarks;

    private LocalDateTime updatedAt;

    public UserSubscription() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Integer getSubscriptionId() { return subscriptionId; }
    public void setSubscriptionId(Integer subscriptionId) { this.subscriptionId = subscriptionId; }
    public Subscription getSubscription() { return subscription; }
    public void setSubscription(Subscription subscription) { this.subscription = subscription; }
    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public Integer getTotalReviewerConsultations() { return totalReviewerConsultations; }
    public void setTotalReviewerConsultations(Integer totalReviewerConsultations) { this.totalReviewerConsultations = totalReviewerConsultations; }
    public Integer getRemainingReviewerConsultations() { return remainingReviewerConsultations; }
    public void setRemainingReviewerConsultations(Integer remainingReviewerConsultations) { this.remainingReviewerConsultations = remainingReviewerConsultations; }
    public LocalDateTime getLastConsultationResetDate() { return lastConsultationResetDate; }
    public void setLastConsultationResetDate(LocalDateTime lastConsultationResetDate) { this.lastConsultationResetDate = lastConsultationResetDate; }
    public Integer getGrantedByAdminId() { return grantedByAdminId; }
    public void setGrantedByAdminId(Integer grantedByAdminId) { this.grantedByAdminId = grantedByAdminId; }
    public User getGrantedByAdmin() { return grantedByAdmin; }
    public void setGrantedByAdmin(User grantedByAdmin) { this.grantedByAdmin = grantedByAdmin; }
    public String getGrantedMethod() { return grantedMethod; }
    public void setGrantedMethod(String grantedMethod) { this.grantedMethod = grantedMethod; }
    public String getAdminRemarks() { return adminRemarks; }
    public void setAdminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}