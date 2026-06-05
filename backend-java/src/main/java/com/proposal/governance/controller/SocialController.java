package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/social")
public class SocialController {
    @GetMapping("feed")
    public ResponseEntity<?> GetCommunityFeed() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("proposals/{proposalId}/social")
    public ResponseEntity<?> GetProposalSocial() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("proposals/{proposalId}/like")
    public ResponseEntity<?> ToggleLike() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("proposals/{proposalId}/comment")
    public ResponseEntity<?> AddComment() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @DeleteMapping("comments/{commentId}")
    public ResponseEntity<?> DeleteComment() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}