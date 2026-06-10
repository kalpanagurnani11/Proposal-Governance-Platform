package com.proposal.governance.repository;

import com.proposal.governance.model.ProposalAccessRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProposalAccessRequestRepository extends JpaRepository<ProposalAccessRequest, Integer> {
}
