package com.proposal.governance.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "Users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 50)
    private String role; // "Admin", "Reviewer", "Founder", "Investor"

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(nullable = false, length = 100)
    private String department; // e.g. "IT", "Finance", "R&D"

    @Column(length = 100)
    private String patentId;

    @Column(length = 50)
    private String patentVerificationStatus; // null, "Unverified", "Verified", "VerificationFailed"

    @Column(columnDefinition = "TEXT")
    private String patentDetailsJson;
    
    public static class UserRoles {
        public static final String ADMIN = "Admin";
        public static final String REVIEWER = "Reviewer";
        public static final String SUBMITTER = "Founder";
        public static final String FOUNDER = "Founder";
        public static final String INVESTOR = "Investor";
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getPatentId() { return patentId; }
    public void setPatentId(String patentId) { this.patentId = patentId; }
    public String getPatentVerificationStatus() { return patentVerificationStatus; }
    public void setPatentVerificationStatus(String patentVerificationStatus) { this.patentVerificationStatus = patentVerificationStatus; }
    public String getPatentDetailsJson() { return patentDetailsJson; }
    public void setPatentDetailsJson(String patentDetailsJson) { this.patentDetailsJson = patentDetailsJson; }
}
