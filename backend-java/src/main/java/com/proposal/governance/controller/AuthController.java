package com.proposal.governance.controller;

import com.proposal.governance.dto.AuthResponse;
import com.proposal.governance.dto.LoginRequest;
import com.proposal.governance.model.User;
import com.proposal.governance.repository.UserRepository;
import com.proposal.governance.service.TokenService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final TokenService tokenService;

    public AuthController(UserRepository userRepository, TokenService tokenService) {
        this.userRepository = userRepository;
        this.tokenService = tokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Optional<User> userOpt = userRepository.findByUsername(loginRequest.getUsername());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // TODO: Implement proper password hashing check (e.g. BCrypt)
            if (user.getPasswordHash().equals(loginRequest.getPassword())) {
                String token = tokenService.generateToken(user);
                return ResponseEntity.ok(new AuthResponse(token, user.getRole(), user.getUsername()));
            }
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid credentials");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            return ResponseEntity.badRequest().body("Username is already taken.");
        }
        
        if (userRepository.existsByEmail(user.getEmail())) {
            return ResponseEntity.badRequest().body("Email is already registered.");
        }

        // TODO: Hash password before saving
        User savedUser = userRepository.save(user);
        
        String token = tokenService.generateToken(savedUser);
        return ResponseEntity.ok(new AuthResponse(token, savedUser.getRole(), savedUser.getUsername()));
    }
}
