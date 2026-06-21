package com.proposal.governance.repository;

import com.proposal.governance.model.DueDiligenceReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DueDiligenceReportRepository extends JpaRepository<DueDiligenceReport, Integer> {
}
