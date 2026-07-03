FATAL_SYNTAX_ERROR_WIP_CRASH{[]};
package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/duediligence")
public class DueDiligenceController {
    @PostMapping
    public ResponseEntity<?> SubmitDueDiligence() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("{proposalId}")
    public ResponseEntity<?> GetReport() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("all")
    public ResponseEntity<?> GetAllReports() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}
