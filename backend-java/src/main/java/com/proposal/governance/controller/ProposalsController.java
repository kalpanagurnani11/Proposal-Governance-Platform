package com.proposal.governance.controller;

import com.proposal.governance.dto.ProposalCreateRequest;
import com.proposal.governance.model.Proposal;
import com.proposal.governance.model.User;
import com.proposal.governance.repository.ProposalRepository;
import com.proposal.governance.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/proposals")
public class ProposalsController {

    private final ProposalRepository proposalRepository;
    private final UserRepository userRepository;

    public ProposalsController(ProposalRepository proposalRepository, UserRepository userRepository) {
        this.proposalRepository = proposalRepository;
        this.userRepository = userRepository;
    }

    private Integer getCurrentUserId() {
        // Fallback for testing purposes - without full JWT parsing configured
        return 1;
    }

    private String getCurrentUserRole() {
        return User.UserRoles.FOUNDER;
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        String role = getCurrentUserRole();
        Integer userId = getCurrentUserId();

        if (User.UserRoles.ADMIN.equals(role)) {
            List<Proposal> proposals = proposalRepository.findAll();
            return ResponseEntity.ok(proposals);
        } else if (User.UserRoles.FOUNDER.equals(role)) {
            List<Proposal> proposals = proposalRepository.findBySubmitterId(userId);
            return ResponseEntity.ok(proposals);
        } else if (User.UserRoles.REVIEWER.equals(role) || User.UserRoles.INVESTOR.equals(role)) {
            List<Proposal> allProposals = proposalRepository.findAll();
            List<Proposal> visibleProposals = allProposals.stream()
                    .filter(p -> !Proposal.ProposalStatuses.DRAFT.equals(p.getStatus()))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(visibleProposals);
        }

        return ResponseEntity.badRequest().body("Invalid user role.");
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Integer id) {
        Optional<Proposal> proposalOpt = proposalRepository.findById(id);
        if (proposalOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Proposal proposal = proposalOpt.get();
        String role = getCurrentUserRole();
        Integer userId = getCurrentUserId();

        if (User.UserRoles.FOUNDER.equals(role) && !proposal.getSubmitter().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(proposal);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ProposalCreateRequest request) {
        Integer userId = getCurrentUserId();
        Optional<User> userOpt = userRepository.findById(userId);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        User user = userOpt.get();

        if (request.getStartupName() == null || request.getStartupName().trim().isEmpty())
            return ResponseEntity.badRequest().body("Startup Name is required.");
        if (request.getProblemStatement() == null || request.getProblemStatement().trim().isEmpty())
            return ResponseEntity.badRequest().body("Problem Statement is required.");
        if (request.getProposedStatement() == null || request.getProposedStatement().trim().isEmpty())
            return ResponseEntity.badRequest().body("Proposed Solution Statement is required.");

        Proposal proposal = new Proposal();
        proposal.setTitle(request.getTitle());
        proposal.setDescription(request.getDescription());
        proposal.setDepartment(user.getDepartment());
        proposal.setRequestedAmount(request.getRequestedAmount());
        proposal.setStatus(Proposal.ProposalStatuses.DRAFT);
        proposal.setSubmitter(user);
        proposal.setSupportingDocumentPath(request.getSupportingDocumentPath() != null ? request.getSupportingDocumentPath() : "");
        proposal.setStartupName(request.getStartupName());
        proposal.setProblemStatement(request.getProblemStatement());
        proposal.setProposedStatement(request.getProposedStatement());
        proposal.setEquityOffered(request.getEquityOffered());
        proposal.setBusinessModel(request.getBusinessModel());
        proposal.setTeamDetails(request.getTeamDetails());
        proposal.setDemoVideoUrl(request.getDemoVideoUrl());

        Proposal savedProposal = proposalRepository.save(proposal);

        return ResponseEntity.status(HttpStatus.CREATED).body(savedProposal);
    }
}
