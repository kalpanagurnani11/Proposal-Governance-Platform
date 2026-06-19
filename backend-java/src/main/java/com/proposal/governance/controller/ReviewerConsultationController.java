package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/reviewer/consultations")
public class ReviewerConsultationController {
    @GetMapping
    public ResponseEntity<?> GetReviewerConsultations() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("{id}/accept")
    public ResponseEntity<?> AcceptConsultation() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("{id}/reject")
    public ResponseEntity<?> RejectConsultation() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("{id}/complete")
    public ResponseEntity<?> CompleteConsultation() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}