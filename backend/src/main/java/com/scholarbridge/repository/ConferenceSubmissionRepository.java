package com.scholarbridge.repository;

import com.scholarbridge.entity.ConferenceSubmission;
import com.scholarbridge.entity.SubmissionStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConferenceSubmissionRepository extends JpaRepository<ConferenceSubmission, Long> {
    List<ConferenceSubmission> findByConferenceIdOrderByIdDesc(Long conferenceId);
    List<ConferenceSubmission> findByConferenceIdAndStatusOrderByIdDesc(Long conferenceId, SubmissionStatus status);
    boolean existsByPaperIdAndConferenceId(Long paperId, Long conferenceId);
}