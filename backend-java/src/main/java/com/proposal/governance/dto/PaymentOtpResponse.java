package com.proposal.governance.dto;








public class PaymentOtpResponse {
    private Boolean success;
    private String message;
    private String emailMasked;
    private String otp;

    public PaymentOtpResponse() {}
    public PaymentOtpResponse(Boolean success, String message, String emailMasked, String otp) {
        this.success = success;
        this.message = message;
        this.emailMasked = emailMasked;
        this.otp = otp;
    }
    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getEmailMasked() { return emailMasked; }
    public void setEmailMasked(String emailMasked) { this.emailMasked = emailMasked; }
    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public static PaymentOtpResponseBuilder builder() { return new PaymentOtpResponseBuilder(); }
    public static class PaymentOtpResponseBuilder {
        private Boolean success;
        private String message;
        private String emailMasked;
        private String otp;
        public PaymentOtpResponseBuilder success(Boolean success) { this.success = success; return this; }
        public PaymentOtpResponseBuilder message(String message) { this.message = message; return this; }
        public PaymentOtpResponseBuilder emailMasked(String emailMasked) { this.emailMasked = emailMasked; return this; }
        public PaymentOtpResponseBuilder otp(String otp) { this.otp = otp; return this; }
        public PaymentOtpResponse build() { return new PaymentOtpResponse(this.success, this.message, this.emailMasked, this.otp); }
    }
}


