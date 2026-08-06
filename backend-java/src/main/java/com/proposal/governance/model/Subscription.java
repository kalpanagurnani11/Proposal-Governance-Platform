package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Subscriptions")




public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String targetRole;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer durationInDays;

    @Column(length = 500)
    private String description;

    private Boolean active;

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

    public Subscription() {}
    public Subscription(Integer id, String name, String targetRole, BigDecimal price, Integer durationInDays, String description, Boolean active) {
        this.id = id;
        this.name = name;
        this.targetRole = targetRole;
        this.price = price;
        this.durationInDays = durationInDays;
        this.description = description;
        this.active = active;
    }
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTargetRole() { return targetRole; }
    public void setTargetRole(String targetRole) { this.targetRole = targetRole; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public Integer getDurationInDays() { return durationInDays; }
    public void setDurationInDays(Integer durationInDays) { this.durationInDays = durationInDays; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public static SubscriptionBuilder builder() { return new SubscriptionBuilder(); }
    public static class SubscriptionBuilder {
        private Integer id;
        private String name;
        private String targetRole;
        private BigDecimal price;
        private Integer durationInDays;
        private String description;
        private Boolean active;
        public SubscriptionBuilder id(Integer id) { this.id = id; return this; }
        public SubscriptionBuilder name(String name) { this.name = name; return this; }
        public SubscriptionBuilder targetRole(String targetRole) { this.targetRole = targetRole; return this; }
        public SubscriptionBuilder price(BigDecimal price) { this.price = price; return this; }
        public SubscriptionBuilder durationInDays(Integer durationInDays) { this.durationInDays = durationInDays; return this; }
        public SubscriptionBuilder description(String description) { this.description = description; return this; }
        public SubscriptionBuilder active(Boolean active) { this.active = active; return this; }
        public Subscription build() { return new Subscription(this.id, this.name, this.targetRole, this.price, this.durationInDays, this.description, this.active); }
    }
}

