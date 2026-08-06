package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "UserSubscriptions")




public class UserSubscription {
    private String razorpayOrderId;
    private String razorpayPaymentId;
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
    public UserSubscription(String razorpayOrderId, String razorpayPaymentId, Integer id, Integer userId, User user, Integer subscriptionId, Subscription subscription, LocalDateTime startDate, LocalDateTime endDate, String status, String paymentId, Integer totalReviewerConsultations, Integer remainingReviewerConsultations, LocalDateTime lastConsultationResetDate, Integer grantedByAdminId, User grantedByAdmin, String grantedMethod, String adminRemarks, LocalDateTime updatedAt) {
        this.razorpayOrderId = razorpayOrderId;
        this.razorpayPaymentId = razorpayPaymentId;
        this.id = id;
        this.userId = userId;
        this.user = user;
        this.subscriptionId = subscriptionId;
        this.subscription = subscription;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
        this.paymentId = paymentId;
        this.totalReviewerConsultations = totalReviewerConsultations;
        this.remainingReviewerConsultations = remainingReviewerConsultations;
        this.lastConsultationResetDate = lastConsultationResetDate;
        this.grantedByAdminId = grantedByAdminId;
        this.grantedByAdmin = grantedByAdmin;
        this.grantedMethod = grantedMethod;
        this.adminRemarks = adminRemarks;
        this.updatedAt = updatedAt;
    }
    public String getRazorpayOrderId() { return razorpayOrderId; }
    public void setRazorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; }
    public String getRazorpayPaymentId() { return razorpayPaymentId; }
    public void setRazorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; }
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

    public static UserSubscriptionBuilder builder() { return new UserSubscriptionBuilder(); }
    public static class UserSubscriptionBuilder {
        private String razorpayOrderId;
        private String razorpayPaymentId;
        private Integer id;
        private Integer userId;
        private User user;
        private Integer subscriptionId;
        private Subscription subscription;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private String status;
        private String paymentId;
        private Integer totalReviewerConsultations;
        private Integer remainingReviewerConsultations;
        private LocalDateTime lastConsultationResetDate;
        private Integer grantedByAdminId;
        private User grantedByAdmin;
        private String grantedMethod;
        private String adminRemarks;
        private LocalDateTime updatedAt;
        public UserSubscriptionBuilder razorpayOrderId(String razorpayOrderId) { this.razorpayOrderId = razorpayOrderId; return this; }
        public UserSubscriptionBuilder razorpayPaymentId(String razorpayPaymentId) { this.razorpayPaymentId = razorpayPaymentId; return this; }
        public UserSubscriptionBuilder id(Integer id) { this.id = id; return this; }
        public UserSubscriptionBuilder userId(Integer userId) { this.userId = userId; return this; }
        public UserSubscriptionBuilder user(User user) { this.user = user; return this; }
        public UserSubscriptionBuilder subscriptionId(Integer subscriptionId) { this.subscriptionId = subscriptionId; return this; }
        public UserSubscriptionBuilder subscription(Subscription subscription) { this.subscription = subscription; return this; }
        public UserSubscriptionBuilder startDate(LocalDateTime startDate) { this.startDate = startDate; return this; }
        public UserSubscriptionBuilder endDate(LocalDateTime endDate) { this.endDate = endDate; return this; }
        public UserSubscriptionBuilder status(String status) { this.status = status; return this; }
        public UserSubscriptionBuilder paymentId(String paymentId) { this.paymentId = paymentId; return this; }
        public UserSubscriptionBuilder totalReviewerConsultations(Integer totalReviewerConsultations) { this.totalReviewerConsultations = totalReviewerConsultations; return this; }
        public UserSubscriptionBuilder remainingReviewerConsultations(Integer remainingReviewerConsultations) { this.remainingReviewerConsultations = remainingReviewerConsultations; return this; }
        public UserSubscriptionBuilder lastConsultationResetDate(LocalDateTime lastConsultationResetDate) { this.lastConsultationResetDate = lastConsultationResetDate; return this; }
        public UserSubscriptionBuilder grantedByAdminId(Integer grantedByAdminId) { this.grantedByAdminId = grantedByAdminId; return this; }
        public UserSubscriptionBuilder grantedByAdmin(User grantedByAdmin) { this.grantedByAdmin = grantedByAdmin; return this; }
        public UserSubscriptionBuilder grantedMethod(String grantedMethod) { this.grantedMethod = grantedMethod; return this; }
        public UserSubscriptionBuilder adminRemarks(String adminRemarks) { this.adminRemarks = adminRemarks; return this; }
        public UserSubscriptionBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public UserSubscription build() { return new UserSubscription(this.razorpayOrderId, this.razorpayPaymentId, this.id, this.userId, this.user, this.subscriptionId, this.subscription, this.startDate, this.endDate, this.status, this.paymentId, this.totalReviewerConsultations, this.remainingReviewerConsultations, this.lastConsultationResetDate, this.grantedByAdminId, this.grantedByAdmin, this.grantedMethod, this.adminRemarks, this.updatedAt); }
    }
}

