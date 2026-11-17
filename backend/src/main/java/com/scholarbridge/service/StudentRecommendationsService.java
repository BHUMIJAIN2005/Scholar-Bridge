package com.scholarbridge.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.scholarbridge.dto.ApiDtos.OpeningResponse;
import com.scholarbridge.dto.ApiDtos.RecommendedOpeningResponse;
import com.scholarbridge.dto.ApiDtos.RecommendedProfessorResponse;
import com.scholarbridge.dto.ApiDtos.StudentProjectItem;
import com.scholarbridge.dto.ApiDtos.StudentResumeDetails;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.OpeningStatus;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.StudentProfile;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.ResearchOpeningRepository;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.CurrentUserService;
import java.util.List;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class StudentRecommendationsService {
    private static final Logger logger = LoggerFactory.getLogger(StudentRecommendationsService.class);
    private static final String DEFAULT_DEPARTMENT = "Computer Science and Engineering";
    private static final int EMBEDDING_DIMENSIONS = 384;

    private final CurrentUserService currentUser;
    private final PaperSubmissionRepository papers;
    private final RestClient mlClient;
    private final UserRepository users;
    private final ApiMapper mapper;
    private final ResearchOpeningRepository openings;

    public StudentRecommendationsService(
        CurrentUserService currentUser,
        PaperSubmissionRepository papers,
        RestClient mlClient,
        UserRepository users,
        ApiMapper mapper,
        ResearchOpeningRepository openings
    ) {
        this.currentUser = currentUser;
        this.papers = papers;
        this.mlClient = mlClient;
        this.users = users;
        this.mapper = mapper;
        this.openings = openings;
    }

    @Transactional(readOnly = true)
    public List<RecommendedProfessorResponse> getRecommendedProfessors() {
        User authenticatedStudent = currentUser.requireRole(UserRole.STUDENT);
        User student = users.findByIdAndRoleWithStudentProfile(
                authenticatedStudent.getId(), UserRole.STUDENT
            )
            .orElseThrow(() -> new BusinessRuleException(
                HttpStatus.NOT_FOUND,
                "Student profile was not found."
            ));
        String studentId = student.getId().toString();

        synchronizeStudentProfile(student);
        Set<String> eligibleProfessorIds = users.findApprovedFacultyWithConfirmedAiResearchProfile(
                UserRole.FACULTY, FacultyApprovalStatus.APPROVED
            ).stream()
            .map(faculty -> faculty.getId().toString())
            .collect(java.util.stream.Collectors.toSet());

        MlProfessorMatchesResponse mlResponse;
        try {
            mlResponse = mlClient.post()
                .uri("/students/{studentId}/match-professors?top_k=5", studentId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new MlProfessorMatchRequest(List.copyOf(eligibleProfessorIds)))
                .retrieve()
                .body(MlProfessorMatchesResponse.class);
        } catch (RestClientException exception) {
            logger.error("ML professor matching failed for student {}", studentId, exception);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "Could not retrieve professor recommendations from the matching service."
            );
        }
        if (mlResponse == null
            || !studentId.equals(mlResponse.studentId())
            || mlResponse.matches() == null) {
            logger.error("ML professor matching returned an invalid response for student {}", studentId);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "The matching service returned an invalid professor recommendation response."
            );
        }

        List<RecommendedProfessorResponse> matchedProfessors = mlResponse.matches().stream()
            .filter(match -> match.isDemo() || eligibleProfessorIds.contains(match.professorId()))
            .map(this::findProfessor)
            .flatMap(Optional::stream)
            .sorted(java.util.Comparator.comparingDouble(RecommendedProfessorResponse::matchScore).reversed())
            .limit(5)
            .toList();
        if (!matchedProfessors.isEmpty()) {
            return matchedProfessors;
        }

        logger.info("No professor matches found for student {}.", studentId);
        return List.of();
    }

    @Transactional
    public List<RecommendedOpeningResponse> getRecommendedOpenings() {
        User authenticatedStudent = currentUser.requireRole(UserRole.STUDENT);
        User student = users.findByIdAndRoleWithStudentProfile(
                authenticatedStudent.getId(), UserRole.STUDENT
            )
            .orElseThrow(() -> new BusinessRuleException(
                HttpStatus.NOT_FOUND,
                "Student profile was not found."
            ));
        String studentId = student.getId().toString();
        synchronizeStudentProfile(student);

        Map<String, ResearchOpening> openOpeningsByMlId = new HashMap<>();
        for (ResearchOpening opening : openings.findAllByOrderByCreatedAtDesc()) {
            String mlOpportunityId = mlOpportunityId(opening);
            synchronizeOpening(opening, mlOpportunityId);
            if (opening.isRecommendationSyncPending()) {
                opening.setRecommendationSyncPending(false);
                openings.save(opening);
            }
            if (opening.getStatus() == OpeningStatus.OPEN) {
                openOpeningsByMlId.put(mlOpportunityId, opening);
            }
        }

        MlOpportunityFeedResponse response;
        try {
            response = mlClient.get()
                .uri("/students/{studentId}/opportunities", studentId)
                .retrieve()
                .body(MlOpportunityFeedResponse.class);
        } catch (RestClientException exception) {
            logger.error("ML opportunity recommendations failed for student {}.", studentId, exception);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "Could not retrieve research opportunity recommendations."
            );
        }
        if (response == null
            || !studentId.equals(response.studentId())
            || response.feed() == null
            || response.count() == null
            || response.count() != response.feed().size()) {
            logger.error("ML returned an invalid opportunity feed for student {}.", studentId);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "The recommendation service returned an invalid opportunity feed."
            );
        }

        Set<String> returnedIds = new HashSet<>();
        return response.feed().stream()
            .filter(match -> validateOpportunityMatch(match, studentId))
            .filter(match -> returnedIds.add(match.opportunityId()))
            .map(match -> {
                ResearchOpening opening = openOpeningsByMlId.get(match.opportunityId());
                if (opening == null) {
                    return null;
                }
                return new RecommendedOpeningResponse(
                    mapper.opening(opening),
                    match.matchScore(),
                    match.relevanceScore(),
                    nonEmpty(match.matchingReasons()),
                    nonEmpty(match.eligibilityGaps())
                );
            })
            .filter(java.util.Objects::nonNull)
            .toList();
    }

    public void synchronizeStudentProfile(User student) {
        if (student == null || student.getRole() != UserRole.STUDENT) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "Only student profiles can be synchronized.");
        }
        StudentProfile profile = student.getStudentProfile();
        String studentId = student.getId().toString();
        StudentProfileSyncRequest syncRequest = new StudentProfileSyncRequest(
            studentId,
            nonBlank(student.getName(), "Anonymous Student"),
            DEFAULT_DEPARTMENT,
            nonBlank(profile == null ? null : profile.getYear(), "3rd Year"),
            profile == null ? "" : nonBlank(profile.getSkills(), ""),
            profile == null ? List.of() : nonEmpty(profile.getSkillTags()),
            profile == null ? List.of() : nonEmpty(profile.getInterests()),
            profile == null ? List.of() : profile.getProjects().stream()
                .map(mapper::studentProject)
                .toList(),
            papers.findByStudentIdOrderByUploadedAtDesc(student.getId()).stream()
                .map(this::paperForMatching)
                .toList(),
            mapper.user(student).studentResumeDetails()
        );

        StudentProfileSyncResponse syncResponse;
        try {
            syncResponse = mlClient.put()
                .uri("/students/{studentId}/profile", studentId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(syncRequest)
                .retrieve()
                .body(StudentProfileSyncResponse.class);
        } catch (RestClientException exception) {
            logger.error("ML service could not sync recommendation profile for student {}", studentId, exception);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "Could not synchronize your profile with the recommendation service."
            );
        }
        if (syncResponse == null
            || !studentId.equals(syncResponse.studentId())
            || syncResponse.embeddingDimensions() != EMBEDDING_DIMENSIONS) {
            logger.error("ML service returned an invalid embedding for student {}", studentId);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "The recommendation service could not generate a valid student profile embedding."
            );
        }
    }

    public void synchronizeOpening(ResearchOpening opening) {
        synchronizeOpening(opening, mlOpportunityId(opening));
    }

    private void synchronizeOpening(ResearchOpening opening, String mlOpportunityId) {
        MlOpportunitySyncResponse response;
        try {
            OpeningResponse publicOpening = mapper.opening(opening);
            response = mlClient.post()
                .uri("/opportunities")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new MlOpportunitySyncRequest(
                    mlOpportunityId,
                    opening.getFaculty().getId().toString(),
                    opening.getTitle(),
                    opening.getDescription(),
                    splitList(opening.getFaculty().getFacultyProfile() == null
                        ? null
                        : opening.getFaculty().getFacultyProfile().getResearchDomains()),
                    splitList(opening.getRequiredSkills()),
                    publicOpening.preferredSkills(),
                    publicOpening.preferredYears(),
                    publicOpening.eligibilityCriteria(),
                    opening.getStatus().name().toLowerCase(Locale.ROOT)
                ))
                .retrieve()
                .body(MlOpportunitySyncResponse.class);
        } catch (RestClientException exception) {
            logger.error("ML service could not synchronize opening {}.", opening.getId(), exception);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "Could not synchronize research opportunities with the recommendation service."
            );
        }
        if (response == null
            || !mlOpportunityId.equals(response.opportunityId())
            || !opening.getStatus().name().equalsIgnoreCase(response.status())) {
            logger.error("ML service returned an invalid sync response for opening {}.", opening.getId());
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "The recommendation service returned an invalid opportunity synchronization response."
            );
        }
    }

    private boolean validateOpportunityMatch(MlOpportunityMatch match, String studentId) {
        if (match == null
            || match.opportunityId() == null
            || match.matchScore() == null
            || !Double.isFinite(match.matchScore())
            || match.matchScore() < 0
            || match.matchScore() > 100
            || match.relevanceScore() == null
            || !Double.isFinite(match.relevanceScore())
            || match.relevanceScore() < 0
            || match.relevanceScore() > 100) {
            logger.error("ML service returned an invalid opportunity match for student {}.", studentId);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "The recommendation service returned an invalid opportunity match."
            );
        }
        return true;
    }

    private String mlOpportunityId(ResearchOpening opening) {
        return "spring-opening-" + opening.getId();
    }

    private List<String> splitList(String values) {
        if (values == null || values.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(values.split(","))
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .distinct()
            .toList();
    }

    private Optional<RecommendedProfessorResponse> findProfessor(MlProfessorMatch match) {
        if (match.matchScore() == null || !Double.isFinite(match.matchScore())
            || match.matchScore() < 0 || match.matchScore() > 100) {
            logger.error("ML service returned an invalid match score for professor {}", match.professorId());
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "The matching service returned an invalid professor match score."
            );
        }

        Long facultyId;
        try {
            facultyId = Long.valueOf(match.professorId());
        } catch (NumberFormatException | NullPointerException exception) {
            logger.warn("Skipping ML professor match with invalid professor ID: {}", match.professorId());
            return Optional.empty();
        }

        if (match.isDemo()) {
            if (facultyId >= 0 || match.professorName() == null || match.professorName().isBlank()) {
                logger.error("ML service returned invalid demo professor metadata for ID {}", match.professorId());
                throw new BusinessRuleException(
                    HttpStatus.BAD_GATEWAY,
                    "The matching service returned invalid demo professor metadata."
                );
            }
            return Optional.of(new RecommendedProfessorResponse(
                facultyId,
                match.professorName(),
                match.department(),
                match.matchScore(),
                nonEmpty(match.researchInterests()),
                nonEmpty(match.sharedInterests()),
                nonBlank(match.whyMatched(), "Similarity computed from confirmed research profiles."),
                true
            ));
        }

        User faculty = users.findApprovedFacultyById(
            facultyId, UserRole.FACULTY, FacultyApprovalStatus.APPROVED
        ).orElse(null);
        if (faculty == null) {
            logger.warn("Skipping ML professor match for faculty {} because no approved faculty profile exists.", facultyId);
            return Optional.empty();
        }

        return Optional.of(new RecommendedProfessorResponse(
            faculty.getId(),
            faculty.getName(),
            faculty.getFacultyProfile() == null ? null : faculty.getFacultyProfile().getDepartment(),
            match.matchScore(),
            nonEmpty(match.researchInterests()),
            nonEmpty(match.sharedInterests()),
            nonBlank(match.whyMatched(), "Research alignment with your profile."),
            false
        ));
    }

    private StudentPaperMatch paperForMatching(PaperSubmission paper) {
        return new StudentPaperMatch(paper.getTitle(), paper.getAbstractText(), paper.getCategory());
    }

    private List<String> nonEmpty(List<String> values) {
        return values == null ? List.of() : values.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(String::trim)
            .toList();
    }

    private String nonBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private record StudentProfileSyncRequest(
        String id,
        String name,
        String department,
        @JsonProperty("academic_year") String academicYear,
        String skills,
        @JsonProperty("skill_tags") List<String> skillTags,
        List<String> interests,
        List<StudentProjectItem> projects,
        List<StudentPaperMatch> papers,
        @JsonProperty("resume_details") StudentResumeDetails resumeDetails
    ) {}

    private record StudentPaperMatch(
        String title,
        @JsonProperty("abstract") String abstractText,
        String category
    ) {}

    private record MlOpportunitySyncRequest(
        @JsonProperty("opportunity_id") String opportunityId,
        @JsonProperty("professor_id") String professorId,
        String title,
        String description,
        @JsonProperty("research_domains") List<String> researchDomains,
        @JsonProperty("required_skills") List<String> requiredSkills,
        @JsonProperty("preferred_skills") List<String> preferredSkills,
        @JsonProperty("preferred_years") List<String> preferredYears,
        @JsonProperty("eligibility_criteria") List<String> eligibilityCriteria,
        String status
    ) {}

    private record MlOpportunitySyncResponse(
        @JsonProperty("opportunity_id") String opportunityId,
        String status
    ) {}

    private record MlOpportunityFeedResponse(
        @JsonProperty("student_id") String studentId,
        List<MlOpportunityMatch> feed,
        Integer count,
        String note
    ) {}

    private record MlOpportunityMatch(
        @JsonProperty("opportunity_id") String opportunityId,
        @JsonProperty("professor_id") String professorId,
        String title,
        String description,
        @JsonProperty("research_domains") List<String> researchDomains,
        @JsonProperty("required_skills") List<String> requiredSkills,
        @JsonProperty("match_score") Double matchScore,
        @JsonProperty("relevance_score") Double relevanceScore,
        @JsonProperty("matching_reasons") List<String> matchingReasons,
        @JsonProperty("eligibility_gaps") List<String> eligibilityGaps,
        String status
    ) {}

    private record StudentProfileSyncResponse(
        @JsonProperty("student_id") String studentId,
        @JsonProperty("embedding_dimensions") int embeddingDimensions
    ) {}

    private record MlProfessorMatchesResponse(
        @JsonProperty("student_id") String studentId,
        List<MlProfessorMatch> matches,
        int count,
        String note
    ) {}

    private record MlProfessorMatchRequest(
        @JsonProperty("eligible_professor_ids") List<String> eligibleProfessorIds
    ) {}

    private record MlProfessorMatch(
        @JsonProperty("professor_id") String professorId,
        @JsonProperty("match_score") Double matchScore,
        @JsonProperty("research_interests") List<String> researchInterests,
        @JsonProperty("shared_research_interests") List<String> sharedInterests,
        @JsonProperty("why_matched") String whyMatched,
        @JsonProperty("professor_name") String professorName,
        String department,
        @JsonProperty("is_demo") boolean isDemo
    ) {}
}
