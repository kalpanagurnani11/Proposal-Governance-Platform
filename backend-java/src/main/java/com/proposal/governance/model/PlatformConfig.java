package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "PlatformConfigs")
public class PlatformConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String key;

    @Column(nullable = false)
    private String value;

    @Column(length = 300)
    private String description;

    private LocalDateTime updatedAt;

    private Integer updatedByAdminId;

    public PlatformConfig() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Integer getUpdatedByAdminId() { return updatedByAdminId; }
    public void setUpdatedByAdminId(Integer updatedByAdminId) { this.updatedByAdminId = updatedByAdminId; }
}