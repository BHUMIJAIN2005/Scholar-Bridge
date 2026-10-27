package com.scholarbridge.repository;

import com.scholarbridge.entity.Application;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByStudentIdOrderByAppliedAtDesc(Long studentId);
    List<Application> findByOpeningIdOrderByAppliedAtDesc(Long openingId);
    boolean existsByStudentIdAndOpeningId(Long studentId, Long openingId);
}