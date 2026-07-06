package com.proposal.governance.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/discussions")
public class DiscussionsController {
    @PostMapping("start")
    public ResponseEntity<?> StartDiscussion() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping
    public ResponseEntity<?> GetMyDiscussions() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @GetMapping("{id}")
    public ResponseEntity<?> GetDiscussionDetails() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("{id}/messages")
    public ResponseEntity<?> SendMessage() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PostMapping("{id}/meeting")
    public ResponseEntity<?> ProposeMeeting() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

    @PutMapping("{discussionId}/meeting/{msgId}/respond")
    public ResponseEntity<?> RespondMeeting() {
        // TODO: Auto-generated stub. Implement business logic here.
        return ResponseEntity.status(501).body("Not Implemented");
    }

}