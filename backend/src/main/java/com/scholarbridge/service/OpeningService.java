package com.scholarbridge.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.dto.ApiDtos.ApplicantResponse;
import com.scholarbridge.dto.ApiDtos.OpeningCreateRequest;
import com.scholarbridge.dto.ApiDtos.OpeningResponse;
import com.scholarbridge.dto.ApiDtos.OpeningUpdateRequest;
import com.scholarbridge.entity.Application;
import com.scholarbridge.entity.OpeningStatus;
import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.exception.ResourceNotFoundException;
import com.scholarbridge.repository.ApplicationRepository;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.ResearchOpeningRepository;
import com.scholarbridge.security.CurrentUserService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OpeningService {
    private static final Logger logger = LoggerFactory.getLogger(OpeningService.class);

    private final ResearchOpeningRepository openings;
    private final ApplicationRepository applications;
    private final PaperSubmissionRepository papers;
    private final CurrentUserService currentUser;
    private final ApiMapper mapper;
    private final ObjectMapper objectMapper;
    private final StudentRecommendationsService recommendations;

    public OpeningService(
        ResearchOpeningRepository openings,
        ApplicationRepository applications,
        PaperSubmissionRepository papers,
        CurrentUserService currentUser,
        ApiMapper mapper,
        ObjectMapper objectMapper,
        StudentRecommendationsService recommendations
    ) {
        this.openings = openings;
        this.applications = applications;
        this.papers = papers;
        this.currentUser = currentUser;
        this.mapper = mapper;
        this.objectMapper = objectMapper;
        this.recommendations = recommendations;
    }

    @Transactional(readOnly = true)
    public List<OpeningResponse> getAll(String search, String skill) {
        User user = currentUser.requireUser();
        List<ResearchOpening> result = user.getRole() == UserRole.FACULTY
            ? openings.findByFacultyIdOrderByCreatedAtDesc(user.getId())
            : openings.findAllByOrderByCreatedAtDesc().stream()
                .filter(opening -> opening.getStatus() == OpeningStatus.OPEN)
                .toList();
        String query = search == null ? "" : search.trim().toLowerCase();
        String skillQuery = skill == null ? "" : skill.trim().toLowerCase();
        return result.stream()
            .filter(opening -> query.isBlank() || matches(opening, query))
            .filter(opening -> skillQuery.isBlank() || opening.getRequiredSkills().toLowerCase().contains(skillQuery))
            .map(mapper::opening)
            .toList();
    }

    @Transactional(readOnly = true)
    public OpeningResponse getById(Long id) {
        ResearchOpening opening = findOpening(id);
        return mapper.opening(opening);
    }

    @Transactional
    public OpeningResponse create(OpeningCreateRequest request) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        ResearchOpening opening = new ResearchOpening();
        opening.setFaculty(faculty);
        opening.setTitle(request.title().trim());
        opening.setDescription(request.description().trim());
        opening.setRequiredSkills(request.requiredSkills().trim());
        opening.setSeats(request.seats());
        applyStructuredFields(
            opening,
            request.preferredSkills(),
            request.preferredYears(),
            request.eligibilityCriteria(),
            request.deadline()
        );
        opening = openings.save(opening);
        synchronizeOpening(opening);
        return mapper.opening(openings.save(opening));
    }

    @Transactional
    public OpeningResponse update(Long openingId, OpeningUpdateRequest request) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        ResearchOpening opening = findOpening(openingId);
        requireOwner(opening, faculty);

        opening.setTitle(request.title().trim());
        opening.setDescription(request.description().trim());
        opening.setRequiredSkills(request.requiredSkills().trim());
        opening.setSeats(request.seats());
        opening.setStatus(request.status());
        applyStructuredFields(
            opening,
            request.preferredSkills(),
            request.preferredYears(),
            request.eligibilityCriteria(),
            request.deadline()
        );
        synchronizeOpening(opening);
        return mapper.opening(openings.save(opening));
    }

    @Transactional(readOnly = true)
    public List<ApplicantResponse> getApplicants(Long openingId) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        ResearchOpening opening = findOpening(openingId);
        requireOwner(opening, faculty);
        return applications.findByOpeningIdOrderByAppliedAtDesc(openingId).stream()
            .map(application -> mapper.applicant(application,
                papers.findByStudentIdOrderByUploadedAtDesc(application.getStudent().getId())))
            .toList();
    }

    public ResearchOpening findOpening(Long id) {
        return openings.findById(id).orElseThrow(() -> new ResourceNotFoundException("Research opening was not found."));
    }

    public void requireOwner(ResearchOpening opening, User user) {
        if (!opening.getFaculty().getId().equals(user.getId())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "Only the faculty member who posted this opening can manage it.");
        }
    }

    private void synchronizeOpening(ResearchOpening opening) {
        try {
            recommendations.synchronizeOpening(opening);
            opening.setRecommendationSyncPending(false);
        } catch (BusinessRuleException exception) {
            opening.setRecommendationSyncPending(true);
            logger.warn(
                "Opening {} was saved in Spring but recommendation synchronization is pending: {}",
                opening.getId(),
                exception.getMessage()
            );
        }
    }

    private void applyStructuredFields(
        ResearchOpening opening,
        List<String> preferredSkills,
        List<String> preferredYears,
        List<String> eligibilityCriteria,
        java.time.LocalDate deadline
    ) {
        opening.setPreferredSkillsJson(writeJson(preferredSkills));
        opening.setPreferredYearsJson(writeJson(preferredYears));
        opening.setEligibilityCriteriaJson(writeJson(eligibilityCriteria));
        opening.setDeadline(deadline);
    }

    private String writeJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values == null ? List.of() : values);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Opening eligibility fields could not be saved.", exception);
        }
    }

    private boolean matches(ResearchOpening opening, String query) {
        return opening.getTitle().toLowerCase().contains(query)
            || opening.getDescription().toLowerCase().contains(query)
            || opening.getRequiredSkills().toLowerCase().contains(query)
            || opening.getFaculty().getName().toLowerCase().contains(query)
            || (opening.getFaculty().getFacultyProfile() != null
                && opening.getFaculty().getFacultyProfile().getDepartment() != null
                && opening.getFaculty().getFacultyProfile().getDepartment().toLowerCase().contains(query));
    }
}