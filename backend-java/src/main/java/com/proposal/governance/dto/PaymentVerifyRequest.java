package com.proposal.governance.dto;








public class PaymentVerifyRequest {
    private String orderId;
    private String paymentId;
    private String signature;
    private String paymentType;
    private Integer subscriptionId;
    private String role;
    private String otp;

    public PaymentVerifyRequest() {}
    public PaymentVerifyRequest(String orderId, String paymentId, String signature, String paymentType, Integer subscriptionId, String role, String otp) {
        this.orderId = orderId;
        this.paymentId = paymentId;
        this.signature = signature;
        this.paymentType = paymentType;
        this.subscriptionId = subscriptionId;
        this.role = role;
        this.otp = otp;
    }
    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }
    public String getPaymentId() { return paymentId; }
    public void setPaymentId(String paymentId) { this.paymentId = paymentId; }
    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }
    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }
    public Integer getSubscriptionId() { return subscriptionId; }
    public void setSubscriptionId(Integer subscriptionId) { this.subscriptionId = subscriptionId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public static PaymentVerifyRequestBuilder builder() { return new PaymentVerifyRequestBuilder(); }
    public static class PaymentVerifyRequestBuilder {
        private String orderId;
        private String paymentId;
        private String signature;
        private String paymentType;
        private Integer subscriptionId;
        private String role;
        private String otp;
        public PaymentVerifyRequestBuilder orderId(String orderId) { this.orderId = orderId; return this; }
        public PaymentVerifyRequestBuilder paymentId(String paymentId) { this.paymentId = paymentId; return this; }
        public PaymentVerifyRequestBuilder signature(String signature) { this.signature = signature; return this; }
        public PaymentVerifyRequestBuilder paymentType(String paymentType) { this.paymentType = paymentType; return this; }
        public PaymentVerifyRequestBuilder subscriptionId(Integer subscriptionId) { this.subscriptionId = subscriptionId; return this; }
        public PaymentVerifyRequestBuilder role(String role) { this.role = role; return this; }
        public PaymentVerifyRequestBuilder otp(String otp) { this.otp = otp; return this; }
        public PaymentVerifyRequest build() { return new PaymentVerifyRequest(this.orderId, this.paymentId, this.signature, this.paymentType, this.subscriptionId, this.role, this.otp); }
    }
}


