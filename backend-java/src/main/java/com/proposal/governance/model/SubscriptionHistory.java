package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "SubscriptionHistorys")
public class SubscriptionHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer userId;

    @jakarta.persistence.Transient

    private User user;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(length = 100)
    private String oldPlan;

    @Column(length = 100)
    private String newPlan;

    private Integer changedByAdminId;

    @jakarta.persistence.Transient

    private User changedByAdmin;

    private String reason;

    private LocalDateTime createdAt;

    public SubscriptionHistory() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getOldPlan() { return oldPlan; }
    public void setOldPlan(String oldPlan) { this.oldPlan = oldPlan; }
    public String getNewPlan() { return newPlan; }
    public void setNewPlan(String newPlan) { this.newPlan = newPlan; }
    public Integer getChangedByAdminId() { return changedByAdminId; }
    public void setChangedByAdminId(Integer changedByAdminId) { this.changedByAdminId = changedByAdminId; }
    public User getChangedByAdmin() { return changedByAdmin; }
    public void setChangedByAdmin(User changedByAdmin) { this.changedByAdmin = changedByAdmin; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}