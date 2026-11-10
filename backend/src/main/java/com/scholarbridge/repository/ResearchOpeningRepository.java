package com.scholarbridge.repository;

import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.OpeningStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

public interface ResearchOpeningRepository extends JpaRepository<ResearchOpening, Long> {
    List<ResearchOpening> findAllByOrderByCreatedAtDesc();
    List<ResearchOpening> findByFacultyIdOrderByCreatedAtDesc(Long facultyId);

    @EntityGraph(attributePaths = {"faculty", "faculty.facultyProfile"})
    List<ResearchOpening> findByFacultyIdAndStatusOrderByCreatedAtDesc(Long facultyId, OpeningStatus status);
}