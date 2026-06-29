package com.proposal.governance.repository;

import com.proposal.governance.model.StartupTrustScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StartupTrustScoreRepository extends JpaRepository<StartupTrustScore, Integer> {
}
