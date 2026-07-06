package com.proposal.governance.repository;

import com.proposal.governance.model.PatentCheckResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PatentCheckResultRepository extends JpaRepository<PatentCheckResult, Integer> {
}
