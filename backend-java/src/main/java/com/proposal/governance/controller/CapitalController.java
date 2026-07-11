FATAL_SYNTAX_ERROR_WIP_CRASH{[]};
package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/capital")
public class CapitalController {
    @GetMapping("summary")
    public ResponseEntity<?> GetSummary() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("allocations")
    public ResponseEntity<?> GetAllocations() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("proposal/{proposalId}")
    public ResponseEntity<?> GetAllocationByProposal() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("transactions/{allocationId}")
    public ResponseEntity<?> GetTransactions() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("allocate")
    public ResponseEntity<?> AllocateFunds() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("drawdown")
    public ResponseEntity<?> RequestDrawdown() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}
