package com.proposal.governance.repository;

import com.proposal.governance.model.Proposal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProposalRepository extends JpaRepository<Proposal, Integer> {
    List<Proposal> findByStatus(String status);
    List<Proposal> findBySubmitterId(Integer submitterId);
}
