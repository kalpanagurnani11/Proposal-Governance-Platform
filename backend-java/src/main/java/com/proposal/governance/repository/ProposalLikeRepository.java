package com.proposal.governance.repository;

import com.proposal.governance.model.ProposalLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProposalLikeRepository extends JpaRepository<ProposalLike, Integer> {
}
