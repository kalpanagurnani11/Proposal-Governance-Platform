package com.proposal.governance.repository;

import com.proposal.governance.model.NDAAgreement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NDAAgreementRepository extends JpaRepository<NDAAgreement, Integer> {
}
