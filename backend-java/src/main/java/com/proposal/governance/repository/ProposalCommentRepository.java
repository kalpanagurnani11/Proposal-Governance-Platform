package com.proposal.governance.repository;

import com.proposal.governance.model.ProposalComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProposalCommentRepository extends JpaRepository<ProposalComment, Integer> {
}
