package com.scholarbridge.repository;

import com.scholarbridge.entity.ResearchOpening;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResearchOpeningRepository extends JpaRepository<ResearchOpening, Long> {
    List<ResearchOpening> findAllByOrderByCreatedAtDesc();
    List<ResearchOpening> findByFacultyIdOrderByCreatedAtDesc(Long facultyId);
}