package com.proposal.governance.repository;

import com.proposal.governance.model.ProposalView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProposalViewRepository extends JpaRepository<ProposalView, Integer> {
}
