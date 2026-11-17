package com.scholarbridge.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.scholarbridge.entity.ApplicationStatus;
import com.scholarbridge.entity.BlogPostStatus;
import com.scholarbridge.entity.BlogReactionType;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.OpeningStatus;
import com.scholarbridge.entity.PaperStatus;
import com.scholarbridge.entity.SubmissionStatus;
import com.scholarbridge.entity.StudentVisibility;
import com.scholarbridge.entity.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class ApiDtos {
    private ApiDtos() {}

    public record SignupRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 100) String password,
        @NotNull UserRole role,
        @Size(max = 160) String department,
        @Size(max = 1000) String researchDomains,
        @Size(max = 1000) String skills,
        @Size(max = 120) String year
    ) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record GoogleLoginRequest(@NotBlank String idToken, UserRole role) {}

    public record GoogleLoginOutcome(boolean needsRole, AuthResponse response) {}

    public record UserResponse(
        Long id,
        String name,
        String email,
        String photoUrl,
        UserRole role,
        FacultyApprovalStatus approvalStatus,
        String department,
        String researchDomains,
        String skills,
        String year,
        Instant createdAt,
        int profileCompleteness,
        List<String> skillTags,
        List<String> interests,
        List<StudentProjectItem> studentProjects,
        String githubUrl,
        String linkedinUrl,
        StudentVisibility visibility,
        String designation,
        String qualifications,
        String bio,
        List<String> researchInterests,
        String officeRoom,
        String officeHours,
        String scholarUrl,
        String orcidUrl,
        String researchGateUrl,
        String facultyLinkedinUrl,
        String websiteUrl,
        Integer citationsCount,
        Integer hIndex,
        Integer i10Index,
        LocalDate statsAsOf,
        Boolean acceptingStudents,
        List<EducationItem> education,
        List<String> awards,
        List<FacultyProjectItem> facultyProjects,
        StudentResumeDetails studentResumeDetails,
        String recommendationSyncWarning
    ) {
        public UserResponse withRecommendationSyncWarning(String warning) {
            return new UserResponse(
                id, name, email, photoUrl, role, approvalStatus, department, researchDomains, skills, year,
                createdAt, profileCompleteness, skillTags, interests, studentProjects, githubUrl, linkedinUrl,
                visibility, designation, qualifications, bio, researchInterests, officeRoom, officeHours,
                scholarUrl, orcidUrl, researchGateUrl, facultyLinkedinUrl, websiteUrl, citationsCount, hIndex,
                i10Index, statsAsOf, acceptingStudents, education, awards, facultyProjects, studentResumeDetails,
                warning
            );
        }
    }

    public record AuthResponse(String token, UserResponse user, String message) {}

    public record ProfileUpdateRequest(
        @Size(max = 120) String name,
        @Size(max = 160) String department,
        @Size(max = 1000) String researchDomains,
        @Size(max = 1000) String skills,
        @Size(max = 120) String year,
        @Pattern(regexp = "(?i)^(https?://\\S+|/api/files/profile-photos/\\S+)$") @Size(max = 500) String photoUrl,
        @Size(max = 160) String designation,
        @Size(max = 2000) String qualifications,
        @Size(max = 5000) String bio,
        @Size(max = 50) List<@NotBlank @Size(max = 120) String> researchInterests,
        @Size(max = 120) String officeRoom,
        @Size(max = 160) String officeHours,
        @Pattern(regexp = "(?i)^https?://\\S+$") @Size(max = 500) String scholarUrl,
        @Pattern(regexp = "(?i)^https?://\\S+$") @Size(max = 500) String orcidUrl,
        @Pattern(regexp = "(?i)^https?://\\S+$") @Size(max = 500) String researchGateUrl,
        @Pattern(regexp = "(?i)^https?://\\S+$") @Size(max = 500) String linkedinUrl,
        @Pattern(regexp = "(?i)^https?://\\S+$") @Size(max = 500) String websiteUrl,
        @PositiveOrZero Integer citationsCount,
        @PositiveOrZero Integer hIndex,
        @PositiveOrZero Integer i10Index,
        LocalDate statsAsOf,
        Boolean acceptingStudents,
        @Size(max = 30) List<@Valid EducationItem> education,
        @Size(max = 50) List<@NotBlank @Size(max = 300) String> awards,
        @Size(max = 50) List<@Valid FacultyProjectItem> facultyProjects,
        @Size(max = 50) List<@NotBlank @Size(max = 120) String> skillTags,
        @Size(max = 50) List<@NotBlank @Size(max = 120) String> interests,
        @Size(max = 50) List<@Valid StudentProjectItem> studentProjects,
        @Pattern(regexp = "(?i)^https?://\\S+$") @Size(max = 500) String githubUrl,
        StudentVisibility visibility,
        @Valid StudentResumeDetails studentResumeDetails
    ) {}

    public record FacultyDirectoryResponse(
        Long id,
        String name,
        String photoUrl,
        String department,
        String designation,
        String bio,
        List<String> researchInterests,
        Integer citationsCount,
        Integer hIndex,
        Integer i10Index,
        Boolean acceptingStudents,
        int profileCompleteness
    ) {}

    public record FacultyDetailResponse(
        Long id,
        String name,
        String photoUrl,
        String department,
        String designation,
        String qualifications,
        String bio,
        List<String> researchInterests,
        String officeRoom,
        String officeHours,
        String scholarUrl,
        String orcidUrl,
        String researchGateUrl,
        String linkedinUrl,
        String websiteUrl,
        Integer citationsCount,
        Integer hIndex,
        Integer i10Index,
        LocalDate statsAsOf,
        Boolean acceptingStudents,
        List<EducationItem> education,
        List<String> awards,
        List<FacultyProjectItem> projects,
        int profileCompleteness,
        List<OpeningResponse> openOpenings,
        List<BlogPostSummaryResponse> publishedBlogPosts,
        List<PublicationResponse> publications
    ) {}

    public record PublicationRequest(
        @NotBlank @Size(max = 300) String title,
        @NotBlank @Size(max = 2000) String authors,
        @Size(max = 300) String venue,
        @PositiveOrZero Integer year,
        @Size(max = 200) String doi,
        @Pattern(regexp = "(?i)^https?://\\S+$") @Size(max = 500) String url
    ) {}

    public record PublicationResponse(
        Long id,
        String title,
        String authors,
        String venue,
        Integer year,
        String doi,
        String url
    ) {}

    public record StudentDirectoryResponse(
        Long id,
        String name,
        String photoUrl,
        String year,
        String skills,
        List<String> skillTags,
        List<String> interests,
        List<StudentProjectItem> projects,
        String githubUrl,
        String linkedinUrl,
        int profileCompleteness
    ) {}

    public record StudentPaperSummaryResponse(
        Long id,
        String title,
        String category,
        Double confidenceScore
    ) {}

    public record StudentDetailResponse(
        Long id,
        String name,
        String photoUrl,
        String year,
        String skills,
        List<String> skillTags,
        List<String> interests,
        List<StudentProjectItem> projects,
        String githubUrl,
        String linkedinUrl,
        int profileCompleteness,
        List<StudentPaperSummaryResponse> papers
    ) {}

    public record RecommendedProfessorResponse(
        Long id,
        String name,
        String department,
        double matchScore,
        List<String> researchInterests,
        List<String> sharedInterests,
        String whyMatched,
        boolean isDemo
    ) {}

    public record RecommendedOpeningResponse(
        OpeningResponse opening,
        double matchScore,
        double relevanceScore,
        List<String> matchingReasons,
        List<String> eligibilityGaps
    ) {}

    public record EducationItem(
        @Size(max = 180) String degree,
        @Size(max = 240) String institution,
        @Size(max = 40) String year
    ) {}

    public record FacultyProjectItem(
        @Size(max = 240) String title,
        @Size(max = 240) String fundingAgency,
        @Size(max = 100) String years,
        @Size(max = 160) String role
    ) {}

    public record StudentProjectItem(
        @Size(max = 240) String title,
        @Size(max = 2000) String description,
        @Size(max = 50) List<@NotBlank @Size(max = 120) String> technologies
    ) {}

    public record StudentEducationItem(
        @Size(max = 180) String degree,
        @JsonAlias("field_of_study")
        @Size(max = 180) String fieldOfStudy,
        @Size(max = 240) String university,
        @JsonAlias("academic_year")
        @Size(max = 120) String academicYear,
        @Size(max = 40) String cgpa
    ) {}

    public record StudentExperienceItem(
        @Size(max = 240) String title,
        @Size(max = 180) String role,
        @Size(max = 240) String organization,
        @Size(max = 4000) String description,
        @Size(max = 50) List<@NotBlank @Size(max = 120) String> technologies,
        @JsonAlias("start_date")
        @Size(max = 120) String startDate,
        @JsonAlias("end_date")
        @Size(max = 120) String endDate
    ) {}

    public record StudentResumeDetails(
        @Pattern(regexp = "(?i)^$|^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$")
        @Size(max = 254) String contactEmail,
        @Size(max = 80) String phone,
        @Size(max = 30) List<@Valid StudentEducationItem> education,
        @Size(max = 50) List<@Valid StudentExperienceItem> internships,
        @Size(max = 50) List<@Valid StudentExperienceItem> workExperience,
        @Size(max = 100) List<@NotBlank @Size(max = 300) String> certifications,
        @Size(max = 100) List<@NotBlank @Size(max = 500) String> achievements,
        @Size(max = 50) List<@Valid StudentExperienceItem> researchExperience
    ) {}

    public record StudentResumeAnalysisResponse(
        String status,
        StudentResumeDraft profile,
        @JsonAlias("extraction_metadata") ResumeExtractionMetadata extractionMetadata,
        List<String> warnings
    ) {}

    public record StudentResumeDraft(
        String name,
        String email,
        String phone,
        @JsonAlias("academic_year") String academicYear,
        List<StudentEducationItem> education,
        @JsonAlias("technical_skills") List<String> technicalSkills,
        @JsonAlias("skill_tags") List<String> skillTags,
        List<StudentProjectItem> projects,
        List<StudentExperienceItem> internships,
        @JsonAlias("work_experience") List<StudentExperienceItem> workExperience,
        List<String> certifications,
        List<String> achievements,
        @JsonAlias("research_interests") List<String> researchInterests,
        @JsonAlias("research_experience") List<StudentExperienceItem> researchExperience
    ) {}

    public record ResumeExtractionMetadata(
        String filename,
        @JsonAlias("document_type") String documentType,
        @JsonAlias("extraction_method") String extractionMethod,
        @JsonAlias("extracted_char_count") int extractedCharCount,
        String status,
        List<String> warnings
    ) {}

    public record OpeningCreateRequest(
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 10000) String description,
        @NotBlank @Size(max = 1000) String requiredSkills,
        @Min(1) int seats,
        @Size(max = 50) List<String> preferredSkills,
        @Size(max = 10) List<String> preferredYears,
        @Size(max = 50) List<String> eligibilityCriteria,
        LocalDate deadline
    ) {
        public OpeningCreateRequest {
            preferredSkills = preferredSkills == null ? List.of() : List.copyOf(preferredSkills);
            preferredYears = preferredYears == null ? List.of() : List.copyOf(preferredYears);
            eligibilityCriteria = eligibilityCriteria == null ? List.of() : List.copyOf(eligibilityCriteria);
        }
    }

    public record OpeningUpdateRequest(
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 10000) String description,
        @NotBlank @Size(max = 1000) String requiredSkills,
        @Min(1) int seats,
        @Size(max = 50) List<String> preferredSkills,
        @Size(max = 10) List<String> preferredYears,
        @Size(max = 50) List<String> eligibilityCriteria,
        LocalDate deadline,
        @NotNull OpeningStatus status
    ) {
        public OpeningUpdateRequest {
            preferredSkills = preferredSkills == null ? List.of() : List.copyOf(preferredSkills);
            preferredYears = preferredYears == null ? List.of() : List.copyOf(preferredYears);
            eligibilityCriteria = eligibilityCriteria == null ? List.of() : List.copyOf(eligibilityCriteria);
        }
    }

    public record OpeningResponse(
        Long id,
        Long facultyId,
        String facultyName,
        String department,
        String title,
        String description,
        String requiredSkills,
        List<String> preferredSkills,
        List<String> preferredYears,
        List<String> eligibilityCriteria,
        int seats,
        LocalDate deadline,
        OpeningStatus status,
        boolean recommendationSyncPending,
        Instant createdAt
    ) {}

    public record ApplyRequest(
        @NotNull Long openingId,
        @NotBlank @Size(min = 20, max = 5000) String statementOfInterest
    ) {}

    public record ApplicationResponse(
        Long id,
        Long studentId,
        Long openingId,
        String openingTitle,
        String facultyName,
        String statementOfInterest,
        ApplicationStatus status,
        Instant appliedAt
    ) {}

    public record ApplicationStatusRequest(@NotNull ApplicationStatus status) {}

    public record ApplicantPaperResponse(Long id, String title, String category, Double confidenceScore) {}

    public record ApplicantResponse(
        Long applicationId,
        Long studentId,
        String studentName,
        String studentEmail,
        String skills,
        String year,
        String statementOfInterest,
        ApplicationStatus status,
        Instant appliedAt,
        List<ApplicantPaperResponse> papers
    ) {}

    public record PaperResponse(
        Long id,
        Long studentId,
        String title,
        String abstractText,
        String fileUrl,
        String category,
        Double confidenceScore,
        PaperStatus status,
        Instant uploadedAt
    ) {}

    public record CategorizeRequest(@NotBlank @Size(max = 1000000) String text) {}
    public record CategorizeResponse(@NotBlank String category, @NotNull Double confidence) {}

    public record ConferenceCreateRequest(
        @NotBlank @Size(max = 180) String name,
        @NotBlank @Size(max = 160) String department,
        @NotNull Instant submissionDeadline,
        @NotNull Instant eventDate,
        @NotEmpty List<@NotBlank @Size(max = 120) String> tracks
    ) {}

    public record ConferenceResponse(
        Long id,
        String name,
        String department,
        Instant submissionDeadline,
        Instant eventDate,
        List<String> tracks
    ) {}

    public record ConferenceSubmitRequest(
        @NotNull Long paperId,
        @NotBlank @Size(max = 120) String track,
        boolean allowPublicPdf
    ) {}

    public record SubmissionStatusRequest(
        @NotNull SubmissionStatus status,
        @Size(max = 5000) String reviewComments
    ) {}

    public record ConferenceSubmissionResponse(
        Long id,
        Long paperId,
        Long conferenceId,
        String track,
        SubmissionStatus status,
        String reviewComments,
        String paperTitle,
        String studentName,
        String abstractText,
        String category,
        Double confidenceScore,
        Instant acceptedAt,
        String publicPdfUrl,
        ConferenceFormatValidationResult formatValidation
    ) {}

    public record ConferenceFormatValidationResult(
        boolean passed,
        List<String> errors,
        List<String> warnings,
        @JsonAlias("page_count") int pageCount,
        @JsonAlias("detected_fonts") List<String> detectedFonts,
        @JsonAlias("detected_sections") List<String> detectedSections,
        String filename,
        @JsonAlias("validation_type") String validationType
    ) {}

    public record ErrorResponse(String message, Instant timestamp) {}

    public record BlogPostRequest(
        @NotBlank @Size(max = 150) String title,
        @NotBlank String content,
        @Size(max = 300) String summary,
        @Size(max = 5) List<@NotBlank @Size(max = 80) String> tags,
        BlogPostStatus status,
        Long linkedPaperId
    ) {}

    public record BlogPaperResponse(Long id, String title, String category) {}

    public record BlogAttachmentResponse(
        Long id,
        String originalFileName,
        long fileSize,
        Instant uploadedAt,
        String downloadUrl
    ) {}

    public record BlogPostSummaryResponse(
        Long id,
        Long authorId,
        String authorName,
        UserRole authorRole,
        String title,
        String summary,
        BlogPostStatus status,
        BlogPaperResponse linkedPaper,
        List<String> tags,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record BlogPostResponse(
        Long id,
        Long authorId,
        String authorName,
        UserRole authorRole,
        String title,
        String summary,
        String content,
        BlogPostStatus status,
        BlogPaperResponse linkedPaper,
        List<String> tags,
        List<BlogAttachmentResponse> attachments,
        Map<BlogReactionType, Long> reactionCounts,
        BlogReactionType currentUserReaction,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record BlogTagResponse(String name, long postCount) {}

    public record BlogReactionRequest(BlogReactionType type) {}

    public record BlogCommentRequest(
        @NotBlank @Size(max = 1000) String content,
        Long parentCommentId
    ) {}

    public record BlogCommentUpdateRequest(@NotBlank @Size(max = 1000) String content) {}

    public record BlogCommentResponse(
        Long id,
        Long authorId,
        String authorName,
        UserRole authorRole,
        String content,
        Instant createdAt,
        Instant updatedAt,
        long likeCount,
        boolean likedByCurrentUser,
        List<BlogCommentResponse> replies
    ) {}

    public record FacultyAiResearchProfileDto(
        List<String> research_interests,
        List<String> research_domains,
        List<String> technical_skills,
        List<String> research_experience,
        List<String> methods,
        List<String> publications,
        List<String> contributions,
        String embedding_text
    ) {
        public FacultyAiResearchProfileDto {
            research_interests = research_interests == null ? List.of() : List.copyOf(research_interests);
            research_domains = research_domains == null ? List.of() : List.copyOf(research_domains);
            technical_skills = technical_skills == null ? List.of() : List.copyOf(technical_skills);
            research_experience = research_experience == null ? List.of() : List.copyOf(research_experience);
            methods = methods == null ? List.of() : List.copyOf(methods);
            publications = publications == null ? List.of() : List.copyOf(publications);
            contributions = contributions == null ? List.of() : List.copyOf(contributions);
        }
    }

    public record FacultyAiLaymanSummaryDto(
        String tldr,
        String why_it_matters,
        String key_insight,
        String analogy,
        List<java.util.Map<String, String>> glossary
    ) {}

    public record FacultyAiStatedRequirementsDto(
        List<String> preferred_skills,
        List<String> preferred_years,
        String notes
    ) {}

    public record FacultyAiDocumentMetadataDto(
        String filename,
        String document_type,
        String extraction_method,
        int extracted_char_count,
        String status,
        List<String> warnings
    ) {}

    public record FacultyAiAnalysisResponse(
        String draft_id,
        String status,
        boolean no_research_content,
        FacultyAiResearchProfileDto research_profile,
        FacultyAiStatedRequirementsDto stated_requirements,
        FacultyAiLaymanSummaryDto layman_summary,
        String reason,
        List<FacultyAiDocumentMetadataDto> extraction_metadata,
        List<String> warnings
    ) {}

    public record FacultyProfileConfirmRequest(
        FacultyAiResearchProfileDto research_profile,
        FacultyAiStatedRequirementsDto stated_requirements,
        FacultyAiLaymanSummaryDto layman_summary,
        String draft_id
    ) {}

    public record FacultyProfileConfirmResponse(
        String professor_id,
        String status,
        boolean is_confirmed,
        String confirmed_at,
        String message,
        int embedding_dimensions,
        FacultyAiResearchProfileDto research_profile,
        FacultyAiStatedRequirementsDto stated_requirements,
        FacultyAiLaymanSummaryDto layman_summary,
        String embedding_sync_status,
        String sync_message
    ) {}

    public record FacultyAiProfileStatusResponse(
        Long faculty_id,
        boolean is_confirmed,
        String confirmed_at,
        FacultyAiResearchProfileDto research_profile,
        FacultyAiStatedRequirementsDto stated_requirements,
        FacultyAiLaymanSummaryDto layman_summary,
        String embedding_sync_status
    ) {}

    public record FacultyStudentMatchDto(
        Object student_id,
        String student_name,
        String department,
        String academic_year,
        List<String> research_interests,
        List<String> relevant_technical_skills,
        double match_score,
        double research_similarity_score,
        Double skill_match_score,
        Double experience_match_score,
        Double preference_match_score,
        List<String> shared_research_interests,
        String why_matched
    ) {}

    public record FacultyStudentMatchesResponse(
        String professor_id,
        List<FacultyStudentMatchDto> matches,
        int count,
        String note
    ) {}
}