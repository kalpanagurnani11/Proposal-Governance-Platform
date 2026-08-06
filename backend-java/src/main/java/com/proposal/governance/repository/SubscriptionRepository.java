package com.proposal.governance.repository;

import com.proposal.governance.model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Integer> {
    java.util.List<com.proposal.governance.model.Subscription> findByTargetRoleAndActiveTrue(String targetRole);
}

