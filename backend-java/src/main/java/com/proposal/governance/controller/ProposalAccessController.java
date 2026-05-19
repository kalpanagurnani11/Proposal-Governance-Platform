package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/proposalaccess")
public class ProposalAccessController {
    @PostMapping("request/{proposalId}")
    public ResponseEntity<?> RequestAccess() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("status/{proposalId}")
    public ResponseEntity<?> GetAccessStatus() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("pending-requests")
    public ResponseEntity<?> GetMyPendingRequests() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("approve/{requestId}")
    public ResponseEntity<?> ApproveRequest() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("reject/{requestId}")
    public ResponseEntity<?> RejectRequest() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("nda/accept/{proposalId}")
    public ResponseEntity<?> AcceptNda() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("log-view/{proposalId}")
    public ResponseEntity<?> LogProposalView() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("log-download/{proposalId}")
    public ResponseEntity<?> LogDocumentDownload() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}