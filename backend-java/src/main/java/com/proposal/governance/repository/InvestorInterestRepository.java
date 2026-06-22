package com.proposal.governance.repository;

import com.proposal.governance.model.InvestorInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InvestorInterestRepository extends JpaRepository<InvestorInterest, Integer> {
}
