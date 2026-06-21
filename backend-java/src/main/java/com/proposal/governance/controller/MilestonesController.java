package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/milestones")
public class MilestonesController {
    @GetMapping("proposal/{proposalId}")
    public ResponseEntity<?> GetMilestones() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping
    public ResponseEntity<?> AddMilestone() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PutMapping("{id}/achieve")
    public ResponseEntity<?> MarkAchieved() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PutMapping("{id}/miss")
    public ResponseEntity<?> MarkMissed() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("updates/proposal/{proposalId}")
    public ResponseEntity<?> GetProgressUpdates() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("updates")
    public ResponseEntity<?> PostProgressUpdate() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("close/{proposalId}")
    public ResponseEntity<?> CloseProject() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("dividends/proposal/{proposalId}")
    public ResponseEntity<?> GetDividendsByProposal() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("dividends/investor/{investorId}")
    public ResponseEntity<?> GetDividendsByInvestor() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("dividends/distribute")
    public ResponseEntity<?> DistributeDividends() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("activate/{proposalId}")
    public ResponseEntity<?> ActivateProject() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}