package com.scholarbridge.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.scholarbridge.dto.ApiDtos.RecommendedProfessorResponse;
import com.scholarbridge.dto.ApiDtos.StudentProjectItem;
import com.scholarbridge.dto.ApiDtos.StudentResumeDetails;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.StudentProfile;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.CurrentUserService;
import java.util.List;
import java.util.Optional;
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

    public StudentRecommendationsService(
        CurrentUserService currentUser,
        PaperSubmissionRepository papers,
        RestClient mlClient,
        UserRepository users,
        ApiMapper mapper
    ) {
        this.currentUser = currentUser;
        this.papers = papers;
        this.mlClient = mlClient;
        this.users = users;
        this.mapper = mapper;
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

        MlProfessorMatchesResponse mlResponse;
        try {
            mlResponse = mlClient.post()
                .uri("/students/{studentId}/match-professors", studentId)
                .retrieve()
                .body(MlProfessorMatchesResponse.class);
        } catch (RestClientException exception) {
            logger.error("ML professor matching failed for student {}", studentId, exception);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "Could not retrieve professor recommendations from the matching service."
            );
        }
        if (mlResponse == null || mlResponse.matches() == null) {
            logger.error("ML professor matching returned an invalid response for student {}", studentId);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "The matching service returned an invalid professor recommendation response."
            );
        }

        List<RecommendedProfessorResponse> matchedProfessors = mlResponse.matches().stream()
            .map(this::findProfessor)
            .flatMap(Optional::stream)
            .toList();
        if (!matchedProfessors.isEmpty()) {
            return matchedProfessors;
        }

        logger.info("No professor matches found for student {}.", studentId);
        return List.of();
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
        return new StudentPaperMatch(paper.getTitle(), paper.getCategory());
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

    private record StudentPaperMatch(String title, String category) {}

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
