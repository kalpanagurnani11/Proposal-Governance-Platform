package com.proposal.governance.repository;

import com.proposal.governance.model.StartupPatentInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StartupPatentInfoRepository extends JpaRepository<StartupPatentInfo, Integer> {
}
