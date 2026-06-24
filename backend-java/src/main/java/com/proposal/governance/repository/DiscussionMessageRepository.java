package com.proposal.governance.repository;

import com.proposal.governance.model.DiscussionMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscussionMessageRepository extends JpaRepository<DiscussionMessage, Integer> {
}
