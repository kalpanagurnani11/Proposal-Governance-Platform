package com.proposal.governance.controller;

import com.proposal.governance.dto.*;
import com.proposal.governance.service.SubscriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/subscription")
public class SubscriptionController {

    @Autowired
    private SubscriptionService subscriptionService;

    @GetMapping("/plans")
    public ResponseEntity<List<SubscriptionPlanResponse>> getPlans(@RequestParam(required = false, defaultValue = "Founder") String role) {
        return ResponseEntity.ok(subscriptionService.getPlansByRole(role));
    }

    @GetMapping("/my")
    public ResponseEntity<MySubscriptionResponse> getMySubscription(Authentication authentication) {
        return ResponseEntity.ok(subscriptionService.getMySubscription(authentication.getName()));
    }

    @PostMapping("/buy")
    public ResponseEntity<BuySubscriptionResponse> buySubscription(Authentication authentication, @RequestBody BuySubscriptionRequest request) {
        return ResponseEntity.ok(subscriptionService.buySubscription(authentication.getName(), request));
    }

    @PostMapping("/cancel")
    public ResponseEntity<Map<String, Object>> cancelSubscription(Authentication authentication) {
        return ResponseEntity.ok(subscriptionService.cancelSubscription(authentication.getName()));
    }
}


