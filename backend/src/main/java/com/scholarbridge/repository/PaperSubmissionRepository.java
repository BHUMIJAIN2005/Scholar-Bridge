package com.scholarbridge.repository;

import com.scholarbridge.entity.PaperSubmission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaperSubmissionRepository extends JpaRepository<PaperSubmission, Long> {
    List<PaperSubmission> findByStudentIdOrderByUploadedAtDesc(Long studentId);
}