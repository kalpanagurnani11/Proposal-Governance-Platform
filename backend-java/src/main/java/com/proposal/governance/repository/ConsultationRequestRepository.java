package com.proposal.governance.repository;

import com.proposal.governance.model.ConsultationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsultationRequestRepository extends JpaRepository<ConsultationRequest, Integer> {
}
