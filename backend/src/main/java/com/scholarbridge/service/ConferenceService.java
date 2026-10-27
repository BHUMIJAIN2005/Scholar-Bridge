package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.ConferenceCreateRequest;
import com.scholarbridge.dto.ApiDtos.ConferenceResponse;
import com.scholarbridge.dto.ApiDtos.ConferenceSubmissionResponse;
import com.scholarbridge.dto.ApiDtos.ConferenceSubmitRequest;
import com.scholarbridge.entity.Conference;
import com.scholarbridge.entity.ConferenceSubmission;
import com.scholarbridge.entity.PaperStatus;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.SubmissionStatus;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.exception.ResourceNotFoundException;
import com.scholarbridge.repository.ConferenceRepository;
import com.scholarbridge.repository.ConferenceSubmissionRepository;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.security.CurrentUserService;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConferenceService {
    private final ConferenceRepository conferences;
    private final ConferenceSubmissionRepository submissions;
    private final PaperSubmissionRepository papers;
    private final CurrentUserService currentUser;
    private final ApiMapper mapper;

    public ConferenceService(
        ConferenceRepository conferences,
        ConferenceSubmissionRepository submissions,
        PaperSubmissionRepository papers,
        CurrentUserService currentUser,
        ApiMapper mapper
    ) {
        this.conferences = conferences;
        this.submissions = submissions;
        this.papers = papers;
        this.currentUser = currentUser;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<ConferenceResponse> getAll() {
        return conferences.findAllByOrderBySubmissionDeadlineAsc().stream().map(mapper::conference).toList();
    }

    @Transactional
    public ConferenceResponse create(ConferenceCreateRequest request) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        Conference conference = new Conference();
        conference.setCreatedBy(faculty);
        conference.setName(request.name().trim());
        conference.setDepartment(request.department().trim());
        conference.setSubmissionDeadline(request.submissionDeadline());
        conference.setEventDate(request.eventDate());
        conference.setTracks(request.tracks().stream().map(String::trim).distinct().toList());
        if (!conference.getSubmissionDeadline().isAfter(Instant.now())) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Submission deadline must be in the future.");
        }
        return mapper.conference(conferences.save(conference));
    }

    @Transactional
    public ConferenceSubmissionResponse submit(Long conferenceId, ConferenceSubmitRequest request) {
        User student = currentUser.requireRole(UserRole.STUDENT);
        Conference conference = findConference(conferenceId);
        if (!conference.getSubmissionDeadline().isAfter(Instant.now())) {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "The submission deadline has passed.");
        }
        PaperSubmission paper = papers.findById(request.paperId())
            .orElseThrow(() -> new ResourceNotFoundException("Paper was not found."));
        if (!paper.getStudent().getId().equals(student.getId())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "You can only submit your own papers.");
        }
        if (paper.getStatus() != PaperStatus.DONE) {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "Only categorized papers can be submitted.");
        }
        String requestedTrack = request.track().trim();
        boolean trackExists = conference.getTracks().stream()
            .anyMatch(track -> track.equalsIgnoreCase(requestedTrack));
        if (!trackExists) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Choose a track offered by this conference.");
        }
        if (submissions.existsByPaperIdAndConferenceId(paper.getId(), conference.getId())) {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "This paper has already been submitted to this conference.");
        }
        ConferenceSubmission submission = new ConferenceSubmission();
        submission.setPaper(paper);
        submission.setConference(conference);
        submission.setTrack(conference.getTracks().stream().filter(track -> track.equalsIgnoreCase(requestedTrack)).findFirst().orElse(requestedTrack));
        return mapper.conferenceSubmission(submissions.save(submission));
    }

    @Transactional(readOnly = true)
    public List<ConferenceSubmissionResponse> getSubmissions(Long conferenceId) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        Conference conference = findConference(conferenceId);
        boolean ownsConference = conference.getCreatedBy().getId().equals(faculty.getId());
        String department = faculty.getFacultyProfile() == null ? null : faculty.getFacultyProfile().getDepartment();
        boolean sameDepartment = department != null && department.equalsIgnoreCase(conference.getDepartment());
        if (!ownsConference && !sameDepartment) {
            return List.of();
        }
        String domains = faculty.getFacultyProfile() == null ? null : faculty.getFacultyProfile().getResearchDomains();
        return submissions.findByConferenceIdOrderByIdDesc(conferenceId).stream()
            .filter(submission -> matchesFacultyTrack(submission.getTrack(), domains))
            .map(mapper::conferenceSubmission)
            .toList();
    }

    @Transactional
    public ConferenceSubmissionResponse updateStatus(Long submissionId, SubmissionStatus status, String comments) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        if (status != SubmissionStatus.ACCEPTED && status != SubmissionStatus.REJECTED) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Submission status must be ACCEPTED or REJECTED.");
        }
        ConferenceSubmission submission = submissions.findById(submissionId)
            .orElseThrow(() -> new ResourceNotFoundException("Conference submission was not found."));
        Conference conference = submission.getConference();
        String department = faculty.getFacultyProfile() == null ? null : faculty.getFacultyProfile().getDepartment();
        boolean canReview = conference.getCreatedBy().getId().equals(faculty.getId())
            || (department != null && department.equalsIgnoreCase(conference.getDepartment()));
        if (!canReview || !matchesFacultyTrack(submission.getTrack(),
            faculty.getFacultyProfile() == null ? null : faculty.getFacultyProfile().getResearchDomains())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "You are not assigned to review this conference track.");
        }
        if (submission.getStatus() == SubmissionStatus.ACCEPTED || submission.getStatus() == SubmissionStatus.REJECTED) {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "This submission has already been reviewed.");
        }
        submission.setStatus(status);
        submission.setReviewComments(comments == null || comments.isBlank() ? null : comments.trim());
        submission.setAcceptedAt(status == SubmissionStatus.ACCEPTED ? Instant.now() : null);
        return mapper.conferenceSubmission(submissions.save(submission));
    }

    @Transactional(readOnly = true)
    public List<ConferenceSubmissionResponse> showcase(Long conferenceId) {
        Conference conference = findConference(conferenceId);
        return submissions.findByConferenceIdAndStatusOrderByIdDesc(conference.getId(), SubmissionStatus.ACCEPTED)
            .stream().map(mapper::conferenceSubmission).toList();
    }

    private Conference findConference(Long id) {
        return conferences.findById(id).orElseThrow(() -> new ResourceNotFoundException("Conference was not found."));
    }

    private boolean matchesFacultyTrack(String track, String domains) {
        if (domains == null || domains.isBlank()) return true;
        String normalizedTrack = track.toLowerCase(Locale.ROOT);
        return java.util.Arrays.stream(domains.split(","))
            .map(String::trim)
            .filter(domain -> !domain.isBlank())
            .anyMatch(domain -> normalizedTrack.contains(domain.toLowerCase(Locale.ROOT))
                || domain.toLowerCase(Locale.ROOT).contains(normalizedTrack));
    }
}