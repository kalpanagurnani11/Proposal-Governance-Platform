package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/verification")
public class VerificationController {
    @PostMapping("founder/submit")
    public ResponseEntity<?> SubmitFounderVerification() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("founder/status")
    public ResponseEntity<?> GetFounderVerificationStatus() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("founder/status/{userId}")
    public ResponseEntity<?> GetFounderVerificationStatusById() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("startup/submit")
    public ResponseEntity<?> SubmitStartupVerification() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("startup/{proposalId}")
    public ResponseEntity<?> GetStartupVerificationStatus() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("admin/pending")
    public ResponseEntity<?> GetPendingVerifications() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("admin/approve/founder/{id}")
    public ResponseEntity<?> ApproveFounder() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("admin/reject/founder/{id}")
    public ResponseEntity<?> RejectFounder() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("admin/approve/startup/{id}")
    public ResponseEntity<?> ApproveStartup() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("admin/reject/startup/{id}")
    public ResponseEntity<?> RejectStartup() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}