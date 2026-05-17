package com.proposal.governance.repository;

import com.proposal.governance.model.CapitalAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CapitalAllocationRepository extends JpaRepository<CapitalAllocation, Integer> {
}
