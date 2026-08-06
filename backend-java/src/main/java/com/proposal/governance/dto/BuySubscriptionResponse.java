package com.proposal.governance.dto;








public class BuySubscriptionResponse {
    private Boolean success;
    private String message;
    private Boolean isFree;
    private String orderId;
    private Integer amountInPaise;
    private String currency;
    private String keyId;
    private String planName;
    private String paymentType;

    public BuySubscriptionResponse() {}
    public BuySubscriptionResponse(Boolean success, String message, Boolean isFree, String orderId, Integer amountInPaise, String currency, String keyId, String planName, String paymentType) {
        this.success = success;
        this.message = message;
        this.isFree = isFree;
        this.orderId = orderId;
        this.amountInPaise = amountInPaise;
        this.currency = currency;
        this.keyId = keyId;
        this.planName = planName;
        this.paymentType = paymentType;
    }
    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Boolean getIsFree() { return isFree; }
    public void setIsFree(Boolean isFree) { this.isFree = isFree; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public Integer getAmountInPaise() { return amountInPaise; }
    public void setAmountInPaise(Integer amountInPaise) { this.amountInPaise = amountInPaise; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getKeyId() { return keyId; }
    public void setKeyId(String keyId) { this.keyId = keyId; }
    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }
    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }

    public static BuySubscriptionResponseBuilder builder() { return new BuySubscriptionResponseBuilder(); }
    public static class BuySubscriptionResponseBuilder {
        private Boolean success;
        private String message;
        private Boolean isFree;
        private String orderId;
        private Integer amountInPaise;
        private String currency;
        private String keyId;
        private String planName;
        private String paymentType;
        public BuySubscriptionResponseBuilder success(Boolean success) { this.success = success; return this; }
        public BuySubscriptionResponseBuilder message(String message) { this.message = message; return this; }
        public BuySubscriptionResponseBuilder isFree(Boolean isFree) { this.isFree = isFree; return this; }
        public BuySubscriptionResponseBuilder orderId(String orderId) { this.orderId = orderId; return this; }
        public BuySubscriptionResponseBuilder amountInPaise(Integer amountInPaise) { this.amountInPaise = amountInPaise; return this; }
        public BuySubscriptionResponseBuilder currency(String currency) { this.currency = currency; return this; }
        public BuySubscriptionResponseBuilder keyId(String keyId) { this.keyId = keyId; return this; }
        public BuySubscriptionResponseBuilder planName(String planName) { this.planName = planName; return this; }
        public BuySubscriptionResponseBuilder paymentType(String paymentType) { this.paymentType = paymentType; return this; }
        public BuySubscriptionResponse build() { return new BuySubscriptionResponse(this.success, this.message, this.isFree, this.orderId, this.amountInPaise, this.currency, this.keyId, this.planName, this.paymentType); }
    }
}


