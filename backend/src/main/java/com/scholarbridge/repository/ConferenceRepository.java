package com.scholarbridge.repository;

import com.scholarbridge.entity.Conference;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConferenceRepository extends JpaRepository<Conference, Long> {
    List<Conference> findAllByOrderBySubmissionDeadlineAsc();
}