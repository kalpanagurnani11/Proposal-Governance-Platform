package com.proposal.governance.repository;

import com.proposal.governance.model.StartupVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StartupVerificationRepository extends JpaRepository<StartupVerification, Integer> {
}
