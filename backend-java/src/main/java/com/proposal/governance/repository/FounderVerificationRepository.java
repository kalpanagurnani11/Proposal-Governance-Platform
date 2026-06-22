package com.proposal.governance.repository;

import com.proposal.governance.model.FounderVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FounderVerificationRepository extends JpaRepository<FounderVerification, Integer> {
}
