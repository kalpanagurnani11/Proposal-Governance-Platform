package com.proposal.governance.repository;

import com.proposal.governance.model.AIAssistantLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AIAssistantLogRepository extends JpaRepository<AIAssistantLog, Integer> {
}
