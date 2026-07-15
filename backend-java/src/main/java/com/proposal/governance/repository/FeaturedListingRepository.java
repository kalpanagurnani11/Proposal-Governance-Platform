package com.proposal.governance.repository;

import com.proposal.governance.model.FeaturedListing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeaturedListingRepository extends JpaRepository<FeaturedListing, Integer> {
}
