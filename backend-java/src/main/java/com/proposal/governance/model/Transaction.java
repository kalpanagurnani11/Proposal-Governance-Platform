package com.proposal.governance.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "Transactions")
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer capitalAllocationId;

    @jakarta.persistence.Transient

    private CapitalAllocation capitalAllocation;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, length = 250)
    private String description;

    private LocalDateTime transactionDate;

    public Transaction() {}
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getCapitalAllocationId() { return capitalAllocationId; }
    public void setCapitalAllocationId(Integer capitalAllocationId) { this.capitalAllocationId = capitalAllocationId; }
    public CapitalAllocation getCapitalAllocation() { return capitalAllocation; }
    public void setCapitalAllocation(CapitalAllocation capitalAllocation) { this.capitalAllocation = capitalAllocation; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDateTime transactionDate) { this.transactionDate = transactionDate; }
}