package com.proposal.governance.repository;

import com.proposal.governance.model.ProgressUpdate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProgressUpdateRepository extends JpaRepository<ProgressUpdate, Integer> {
}
