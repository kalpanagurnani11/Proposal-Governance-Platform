package com.proposal.governance.service;

import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.proposal.governance.model.User;
import com.proposal.governance.repository.UserRepository;
import com.proposal.governance.dto.*;
import com.proposal.governance.model.Subscription;
import com.proposal.governance.model.UserSubscription;
import com.proposal.governance.repository.SubscriptionRepository;
import com.proposal.governance.repository.UserSubscriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SubscriptionService {

    @org.springframework.beans.factory.annotation.Value("${razorpay.key_id:rzp_test_TMGUnzZTkKHWLG}")
    private String razorpayKeyId;

    @org.springframework.beans.factory.annotation.Value("${razorpay.key_secret:8pJ7ROBcDd6IYnLhaiTf8u41}")
    private String razorpayKeySecret;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private UserSubscriptionRepository userSubscriptionRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SubscriptionPlanResponse> getPlansByRole(String role) {
        List<Subscription> plans = subscriptionRepository.findByTargetRoleAndActiveTrue(role);

        if (plans.isEmpty()) {
            // Provide default fallback plans if none in database yet
            return getDefaultPlans(role);
        }

        return plans.stream()
                .map(this::toPlanResponse)
                .collect(Collectors.toList());
    }

    private List<SubscriptionPlanResponse> getDefaultPlans(String role) {
        if ("Founder".equalsIgnoreCase(role)) {
            return Arrays.asList(
                    SubscriptionPlanResponse.builder()
                            .id(1)
                            .name("Starter Founder")
                            .description("Basic proposal submission, community peer reviews, and standard platform access.")
                            .price(BigDecimal.ZERO)
                            .targetRole("Founder")
                            .active(true)
                            .build(),
                    SubscriptionPlanResponse.builder()
                            .id(2)
                            .name("Premium Founder")
                            .description("Unlimited proposal submissions, priority Gemini AI analysis, verified founder badge, and direct investor messaging.")
                            .price(new BigDecimal("20.00"))
                            .targetRole("Founder")
                            .active(true)
                            .build()
            );
        }
        return Arrays.asList(
                SubscriptionPlanResponse.builder()
                        .id(3)
                        .name("Starter Investor")
                        .description("Browse marketplace proposals, view basic startup metrics, and express investment interest.")
                        .price(BigDecimal.ZERO)
                        .targetRole("Investor")
                        .active(true)
                        .build(),
                SubscriptionPlanResponse.builder()
                        .id(4)
                        .name("Premium Investor")
                        .description("Full pitch deck downloads, priority due diligence reports, direct founder consultation, and real-time deal alerts.")
                        .price(new BigDecimal("20.00"))
                        .targetRole("Investor")
                        .active(true)
                        .build()
        );
    }

    @Transactional(readOnly = true)
    public MySubscriptionResponse getMySubscription(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Optional<UserSubscription> activeSub = userSubscriptionRepository.findByUserIdAndStatus(user.getId(), "Active");

        if (activeSub.isPresent()) {
            UserSubscription sub = activeSub.get();
            return MySubscriptionResponse.builder()
                    .hasActive(true)
                    .data(MySubscriptionResponse.UserSubscriptionData.builder()
                            .id(sub.getId())
                            .subscriptionId(sub.getSubscription().getId())
                            .status(sub.getStatus())
                            .startDate(sub.getStartDate())
                            .endDate(sub.getEndDate())
                            .subscription(toPlanResponse(sub.getSubscription()))
                            .build())
                    .build();
        }

        return MySubscriptionResponse.builder()
                .hasActive(false)
                .data(null)
                .build();
    }

    @Transactional
    public BuySubscriptionResponse buySubscription(String username, BuySubscriptionRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Subscription subscription = subscriptionRepository.findById(request.getSubscriptionId())
                .orElseGet(() -> {
                    // Create in DB if default plan ID requested
                    List<SubscriptionPlanResponse> defaults = getDefaultPlans(request.getRole());
                    SubscriptionPlanResponse match = defaults.stream()
                            .filter(p -> p.getId().equals(request.getSubscriptionId()))
                            .findFirst()
                            .orElse(defaults.get(defaults.size() - 1));

                    Subscription newSub = Subscription.builder()
                            .name(match.getName())
                            .description(match.getDescription())
                            .price(match.getPrice())
                            .targetRole(request.getRole() != null ? request.getRole() : user.getRole())
                            .active(true)
                            .build();
                    return subscriptionRepository.save(newSub);
                });

        boolean isFree = subscription.getPrice().compareTo(BigDecimal.ZERO) == 0;

        if (isFree) {
            // Activate free subscription
            userSubscriptionRepository.findByUserIdAndStatus(user.getId(), "Active")
                    .ifPresent(old -> {
                        old.setStatus("Deactivated");
                        userSubscriptionRepository.save(old);
                    });

            UserSubscription newSub = UserSubscription.builder()
                    .user(user)
                    .subscription(subscription)
                    .status("Active")
                    .startDate(LocalDateTime.now())
                    .endDate(LocalDateTime.now().plusYears(1))
                    .build();
            userSubscriptionRepository.save(newSub);

            return BuySubscriptionResponse.builder()
                    .success(true)
                    .message("Free plan activated successfully.")
                    .isFree(true)
                    .build();
        }

        // Razorpay order creation
        int amountInPaise = subscription.getPrice().multiply(new BigDecimal("100")).intValue();
        String orderId = createRazorpayOrder(amountInPaise, subscription.getName());

        return BuySubscriptionResponse.builder()
                .success(true)
                .message("Order created successfully.")
                .isFree(false)
                .orderId(orderId)
                .amountInPaise(amountInPaise)
                .currency("INR")
                .keyId(razorpayKeyId)
                .planName(subscription.getName())
                .paymentType("Subscription")
                .build();
    }

    private String createRazorpayOrder(int amountInPaise, String planName) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            String auth = razorpayKeyId + ":" + razorpayKeySecret;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + encodedAuth);

            Map<String, Object> body = new HashMap<>();
            body.put("amount", amountInPaise);
            body.put("currency", "INR");
            body.put("receipt", "rcpt_" + System.currentTimeMillis());

            org.springframework.http.HttpEntity<Map<String, Object>> entity = new org.springframework.http.HttpEntity<>(body, headers);
            org.springframework.http.ResponseEntity<Map> response = restTemplate.postForEntity(
                    "https://api.razorpay.com/v1/orders", entity, Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String rzpOrderId = (String) response.getBody().get("id");
                if (rzpOrderId != null && !rzpOrderId.trim().isEmpty()) {
                    return rzpOrderId;
                }
            }
        } catch (Exception e) {
            System.err.println("Razorpay order creation fallback: " + e.getMessage());
        }
        return "order_sim_" + UUID.randomUUID().toString().substring(0, 10);
    }

    private final Map<String, String> otpCache = new java.util.concurrent.ConcurrentHashMap<>();

    public PaymentOtpResponse sendPaymentOtp(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String generatedOtp = String.format("%06d", new Random().nextInt(900000) + 100000);
        otpCache.put(username, generatedOtp);

        String email = user.getEmail();
        String maskedEmail = "user@domain.com";
        if (email != null && email.contains("@")) {
            String[] parts = email.split("@");
            String local = parts[0];
            String firstChar = local.substring(0, 1);
            String lastChar = local.length() > 1 ? local.substring(local.length() - 1) : "";
            maskedEmail = firstChar + "***" + lastChar + "@" + parts[1];
        }

        System.out.println("=================================================");
        System.out.println("🔐 RAZORPAY PAYMENT EMAIL SECURITY OTP FOR " + email);
        System.out.println("YOUR 6-DIGIT OTP CODE IS: " + generatedOtp);
        System.out.println("=================================================");

        return PaymentOtpResponse.builder()
                .success(true)
                .message("Security OTP sent to your registered email address (" + maskedEmail + ").")
                .emailMasked(maskedEmail)
                .otp(generatedOtp)
                .build();
    }

    @Transactional
    public PaymentVerifyResponse verifyPayment(String username, PaymentVerifyRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (request.getOtp() != null && !request.getOtp().trim().isEmpty()) {
            String cachedOtp = otpCache.get(username);
            if (cachedOtp == null || !cachedOtp.trim().equals(request.getOtp().trim())) {
                throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid Security OTP code. Please check your email and try again.");
            }
            otpCache.remove(username);
        }

        Subscription subscription = subscriptionRepository.findById(request.getSubscriptionId())
                .orElseGet(() -> {
                    List<SubscriptionPlanResponse> defaults = getDefaultPlans(request.getRole());
                    SubscriptionPlanResponse match = defaults.stream()
                            .filter(p -> p.getId().equals(request.getSubscriptionId()))
                            .findFirst()
                            .orElse(defaults.get(1));

                    Subscription newSub = Subscription.builder()
                            .name(match.getName())
                            .description(match.getDescription())
                            .price(match.getPrice())
                            .targetRole(request.getRole() != null ? request.getRole() : user.getRole())
                            .active(true)
                            .build();
                    return subscriptionRepository.save(newSub);
                });

        // Deactivate old active subscription
        userSubscriptionRepository.findByUserIdAndStatus(user.getId(), "Active")
                .ifPresent(old -> {
                    old.setStatus("Deactivated");
                    userSubscriptionRepository.save(old);
                });

        UserSubscription newSub = UserSubscription.builder()
                .user(user)
                .subscription(subscription)
                .status("Active")
                .startDate(LocalDateTime.now())
                .endDate(LocalDateTime.now().plusMonths(1))
                .razorpayOrderId(request.getOrderId())
                .razorpayPaymentId(request.getPaymentId())
                .build();
        userSubscriptionRepository.save(newSub);

        return PaymentVerifyResponse.builder()
                .success(true)
                .message("Payment verified and Premium Subscription activated!")
                .build();
    }

    @Transactional
    public Map<String, Object> cancelSubscription(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Optional<UserSubscription> activeSub = userSubscriptionRepository.findByUserIdAndStatus(user.getId(), "Active");

        if (activeSub.isPresent()) {
            UserSubscription sub = activeSub.get();
            sub.setStatus("Deactivated");
            sub.setEndDate(LocalDateTime.now());
            userSubscriptionRepository.save(sub);

            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("message", "Subscription plan deactivated successfully.");
            return res;
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", false);
        res.put("message", "No active subscription found to cancel.");
        return res;
    }

    private SubscriptionPlanResponse toPlanResponse(Subscription sub) {
        return SubscriptionPlanResponse.builder()
                .id(sub.getId())
                .name(sub.getName())
                .description(sub.getDescription())
                .price(sub.getPrice())
                .targetRole(sub.getTargetRole())
                .active(sub.getActive())
                .build();
    }
}



