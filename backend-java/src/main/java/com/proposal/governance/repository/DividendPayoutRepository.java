package com.proposal.governance.repository;

import com.proposal.governance.model.DividendPayout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DividendPayoutRepository extends JpaRepository<DividendPayout, Integer> {
}
