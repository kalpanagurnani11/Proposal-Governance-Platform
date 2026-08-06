package com.proposal.governance.dto;



import java.math.BigDecimal;






public class SubscriptionPlanResponse {
    private Integer id;
    private String name;
    private String description;
    private BigDecimal price;
    private String targetRole;
    private Boolean active;

    public SubscriptionPlanResponse() {}
    public SubscriptionPlanResponse(Integer id, String name, String description, BigDecimal price, String targetRole, Boolean active) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.targetRole = targetRole;
        this.active = active;
    }
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getTargetRole() { return targetRole; }
    public void setTargetRole(String targetRole) { this.targetRole = targetRole; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public static SubscriptionPlanResponseBuilder builder() { return new SubscriptionPlanResponseBuilder(); }
    public static class SubscriptionPlanResponseBuilder {
        private Integer id;
        private String name;
        private String description;
        private BigDecimal price;
        private String targetRole;
        private Boolean active;
        public SubscriptionPlanResponseBuilder id(Integer id) { this.id = id; return this; }
        public SubscriptionPlanResponseBuilder name(String name) { this.name = name; return this; }
        public SubscriptionPlanResponseBuilder description(String description) { this.description = description; return this; }
        public SubscriptionPlanResponseBuilder price(BigDecimal price) { this.price = price; return this; }
        public SubscriptionPlanResponseBuilder targetRole(String targetRole) { this.targetRole = targetRole; return this; }
        public SubscriptionPlanResponseBuilder active(Boolean active) { this.active = active; return this; }
        public SubscriptionPlanResponse build() { return new SubscriptionPlanResponse(this.id, this.name, this.description, this.price, this.targetRole, this.active); }
    }
}


