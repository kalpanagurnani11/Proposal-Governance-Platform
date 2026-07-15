package com.proposal.governance.repository;

import com.proposal.governance.model.DocumentDownload;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentDownloadRepository extends JpaRepository<DocumentDownload, Integer> {
}
