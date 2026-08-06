package com.proposal.governance.controller;

import com.proposal.governance.dto.PaymentOtpResponse;
import com.proposal.governance.dto.PaymentVerifyRequest;
import com.proposal.governance.dto.PaymentVerifyResponse;
import com.proposal.governance.service.SubscriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment")
public class PaymentController {

    @Autowired
    private SubscriptionService subscriptionService;

    @PostMapping("/send-otp")
    public ResponseEntity<PaymentOtpResponse> sendPaymentOtp(Authentication authentication) {
        return ResponseEntity.ok(subscriptionService.sendPaymentOtp(authentication.getName()));
    }

    @PostMapping("/verify")
    public ResponseEntity<PaymentVerifyResponse> verifyPayment(Authentication authentication, @RequestBody PaymentVerifyRequest request) {
        return ResponseEntity.ok(subscriptionService.verifyPayment(authentication.getName(), request));
    }
}


