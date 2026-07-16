package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "NDAAgreements")
public class NDAAgreement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer startupId;

    @jakarta.persistence.Transient

    private Proposal startup;

    @Column(nullable = false)
    private Integer investorId;

    @jakarta.persistence.Transient

    private User investor;

    @Column(nullable = false)
    private LocalDateTime acceptedAt;

    @Column(nullable = false, length = 45)
    private String ipAddress;

    @Column(nullable = false, length = 10)
    private String version;

    public NDAAgreement() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getStartupId() { return startupId; }
    public void setStartupId(Integer startupId) { this.startupId = startupId; }
    public Proposal getStartup() { return startup; }
    public void setStartup(Proposal startup) { this.startup = startup; }
    public Integer getInvestorId() { return investorId; }
    public void setInvestorId(Integer investorId) { this.investorId = investorId; }
    public User getInvestor() { return investor; }
    public void setInvestor(User investor) { this.investor = investor; }
    public LocalDateTime getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime acceptedAt) { this.acceptedAt = acceptedAt; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
}