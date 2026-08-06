package com.proposal.governance.dto;








public class BuySubscriptionRequest {
    private Integer subscriptionId;
    private String role;

    public BuySubscriptionRequest() {}
    public BuySubscriptionRequest(Integer subscriptionId, String role) {
        this.subscriptionId = subscriptionId;
        this.role = role;
    }
    public Integer getSubscriptionId() { return subscriptionId; }
    public void setSubscriptionId(Integer subscriptionId) { this.subscriptionId = subscriptionId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public static BuySubscriptionRequestBuilder builder() { return new BuySubscriptionRequestBuilder(); }
    public static class BuySubscriptionRequestBuilder {
        private Integer subscriptionId;
        private String role;
        public BuySubscriptionRequestBuilder subscriptionId(Integer subscriptionId) { this.subscriptionId = subscriptionId; return this; }
        public BuySubscriptionRequestBuilder role(String role) { this.role = role; return this; }
        public BuySubscriptionRequest build() { return new BuySubscriptionRequest(this.subscriptionId, this.role); }
    }
}


