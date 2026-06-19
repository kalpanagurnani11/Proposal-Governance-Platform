package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/trust")
public class TrustController {
    @GetMapping("{proposalId}")
    public ResponseEntity<?> GetTrustDashboard() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("recompute/{proposalId}")
    public ResponseEntity<?> RecomputeTrustScore() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("all")
    public ResponseEntity<?> GetAllScores() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}