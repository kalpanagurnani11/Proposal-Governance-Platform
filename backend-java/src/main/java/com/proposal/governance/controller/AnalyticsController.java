package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    @GetMapping("dashboard")
    public ResponseEntity<?> GetDashboardMetrics() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("emails")
    public ResponseEntity<?> GetSandboxEmails() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}
