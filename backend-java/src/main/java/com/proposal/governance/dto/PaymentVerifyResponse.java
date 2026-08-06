package com.proposal.governance.dto;

public class PaymentVerifyResponse {
    private Boolean success;
    private String message;

    public PaymentVerifyResponse() {}

    public PaymentVerifyResponse(Boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public static PaymentVerifyResponseBuilder builder() { return new PaymentVerifyResponseBuilder(); }

    public static class PaymentVerifyResponseBuilder {
        private Boolean success;
        private String message;

        public PaymentVerifyResponseBuilder success(Boolean success) { this.success = success; return this; }
        public PaymentVerifyResponseBuilder message(String message) { this.message = message; return this; }
        public PaymentVerifyResponse build() { return new PaymentVerifyResponse(success, message); }
    }
}
