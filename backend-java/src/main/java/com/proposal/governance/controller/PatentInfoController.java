package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/patentinfo")
public class PatentInfoController {
    @PostMapping("startup/submit")
    public ResponseEntity<?> SubmitPatentInfo() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("startup/{proposalId}")
    public ResponseEntity<?> GetPatentInfo() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("check/{proposalId}")
    public ResponseEntity<?> RunPatentCheck() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("results/{proposalId}")
    public ResponseEntity<?> GetCheckResults() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("verify/{proposalId}")
    public ResponseEntity<?> VerifyPatentStatus() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}