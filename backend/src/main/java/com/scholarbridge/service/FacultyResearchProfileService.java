package com.scholarbridge.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.dto.ApiDtos.FacultyAiAnalysisResponse;
import com.scholarbridge.dto.ApiDtos.FacultyAiLaymanSummaryDto;
import com.scholarbridge.dto.ApiDtos.FacultyAiProfileStatusResponse;
import com.scholarbridge.dto.ApiDtos.FacultyAiResearchProfileDto;
import com.scholarbridge.dto.ApiDtos.FacultyAiStatedRequirementsDto;
import com.scholarbridge.dto.ApiDtos.FacultyProfileConfirmRequest;
import com.scholarbridge.dto.ApiDtos.FacultyProfileConfirmResponse;
import com.scholarbridge.dto.ApiDtos.FacultyStudentMatchesResponse;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.CurrentUserService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FacultyResearchProfileService {
    private static final Logger logger = LoggerFactory.getLogger(FacultyResearchProfileService.class);
    private static final String RESEARCH_EMBEDDING_MODEL = "all-MiniLM-L6-v2";
    private static final int RESEARCH_EMBEDDING_DIMENSIONS = 384;
    private static final long MAX_DOCUMENT_SIZE = 25L * 1024 * 1024;
    private static final long MAX_TOTAL_DOCUMENT_SIZE = 100L * 1024 * 1024;
    private static final int MAX_DOCUMENT_COUNT = 10;

    private final RestClient mlClient;
    private final CurrentUserService currentUser;
    private final UserRepository users;
    private final ObjectMapper objectMapper;
    private final StudentRecommendationsService recommendations;

    public FacultyResearchProfileService(
        RestClient mlClient,
        CurrentUserService currentUser,
        UserRepository users,
        ObjectMapper objectMapper,
        StudentRecommendationsService recommendations
    ) {
        this.mlClient = mlClient;
        this.currentUser = currentUser;
        this.users = users;
        this.objectMapper = objectMapper;
        this.recommendations = recommendations;
    }

    public FacultyAiAnalysisResponse analyzeDocuments(List<MultipartFile> files, List<String> documentTypes) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);

        if (files == null || files.isEmpty()) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Please upload at least one PDF file.");
        }
        if (files.size() > MAX_DOCUMENT_COUNT) {
            throw new BusinessRuleException(
                HttpStatus.PAYLOAD_TOO_LARGE,
                "Upload no more than 10 research documents at a time."
            );
        }
        if (documentTypes != null && documentTypes.size() != files.size()) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Choose a document type for each uploaded file.");
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        long totalSize = 0;
        for (MultipartFile file : files) {
            String name = file.getOriginalFilename() == null ? "document.pdf" : file.getOriginalFilename();
            if (file.isEmpty()) {
                throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "File '" + name + "' is empty.");
            }
            if (file.getSize() > MAX_DOCUMENT_SIZE) {
                throw new BusinessRuleException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Each research document must be 25 MB or smaller."
                );
            }
            totalSize += file.getSize();
            if (totalSize > MAX_TOTAL_DOCUMENT_SIZE) {
                throw new BusinessRuleException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "The combined research documents must be 100 MB or smaller."
                );
            }
            if (!name.toLowerCase(Locale.ROOT).endsWith(".pdf")
                && !MediaType.APPLICATION_PDF_VALUE.equalsIgnoreCase(file.getContentType())) {
                throw new BusinessRuleException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Upload PDF research documents only."
                );
            }
            try {
                byte[] content = file.getBytes();
                if (content.length < 5
                    || !new String(content, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-")) {
                    throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "File '" + name + "' is not a valid PDF.");
                }
                ByteArrayResource resource = new ByteArrayResource(content) {
                    @Override
                    public String getFilename() {
                        return name;
                    }
                };
                body.add("files", resource);
            } catch (IOException e) {
                throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Failed to read uploaded file: " + name);
            }
        }

        if (documentTypes != null) {
            for (String dt : documentTypes) {
                body.add("document_types", dt);
            }
        }

        try {
            FacultyAiAnalysisResponse response = mlClient.post()
                .uri("/professor/analyze-documents")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(FacultyAiAnalysisResponse.class);
            if (response == null
                || (!"no_research_content".equals(response.status())
                    && (!"success".equals(response.status()) || response.research_profile() == null))) {
                throw new BusinessRuleException(
                    HttpStatus.BAD_GATEWAY,
                    "The AI service returned an incomplete research profile."
                );
            }
            return response;
        } catch (BusinessRuleException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            logger.error(
                "ML service document analysis failed for faculty {} with HTTP status {}.",
                faculty.getId(),
                exception.getStatusCode().value()
            );
            throw new BusinessRuleException(
                mapUpstreamStatus(exception.getStatusCode().value()),
                analysisFailureMessage(exception.getStatusCode().value())
            );
        } catch (RestClientException exception) {
            logger.error(
                "ML service document analysis failed for faculty {} ({}).",
                faculty.getId(),
                exception.getClass().getSimpleName()
            );
            throw new BusinessRuleException(
                isTimeout(exception) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                isTimeout(exception)
                    ? "AI document analysis timed out. Please try again."
                    : "Could not complete AI document analysis. Please try again."
            );
        }
    }

    @Transactional
    public FacultyProfileConfirmResponse confirmProfile(FacultyProfileConfirmRequest request) {
        User faculty = currentFacultyWithProfile();
        if (request == null || request.research_profile() == null) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "A research profile is required for confirmation.");
        }
        FacultyAiResearchProfileDto researchProfile = validateAndNormalizeResearchProfile(request.research_profile());
        FacultyProfile profile = faculty.getFacultyProfile();
        if (profile == null) {
            profile = new FacultyProfile();
            profile.setUser(faculty);
            faculty.setFacultyProfile(profile);
        }

        String researchProfileJson;
        String laymanSummaryJson = null;
        String statedRequirementsJson = null;
        try {
            researchProfileJson = objectMapper.writeValueAsString(researchProfile);
            if (request.layman_summary() != null) {
                laymanSummaryJson = objectMapper.writeValueAsString(request.layman_summary());
            }
            if (request.stated_requirements() != null) {
                statedRequirementsJson = objectMapper.writeValueAsString(request.stated_requirements());
            }
        } catch (JsonProcessingException exception) {
            throw new BusinessRuleException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "The confirmed research profile could not be prepared for storage."
            );
        }

        profile.setAiProfileConfirmed(true);
        profile.setAiProfileConfirmedAt(Instant.now());
        profile.setAiResearchProfileJson(researchProfileJson);
        profile.setAiResearchProfileEmbeddingJson(null);
        profile.setAiResearchEmbeddingModel(null);
        synchronizePublicResearchFields(profile, researchProfile);
        profile.setAiLaymanSummaryJson(laymanSummaryJson);
        profile.setAiStatedRequirementsJson(statedRequirementsJson);
        users.saveAndFlush(faculty);

        try {
            MlProfileConfirmResponse mlResponse = confirmWithMl(
                faculty.getId(),
                researchProfile,
                request.stated_requirements(),
                request.layman_summary(),
                request.draft_id(),
                null,
                profile.getAiProfileConfirmedAt()
            );
            persistEmbedding(profile, mlResponse);
            users.saveAndFlush(faculty);
            logger.info("Persisted confirmed AI research profile and embedding for faculty id {}.", faculty.getId());
            return confirmResponse(profile, mlResponse, request.stated_requirements(), request.layman_summary());
        } catch (BusinessRuleException exception) {
            logger.error(
                "Faculty profile {} was saved, but ML embedding synchronization is pending ({}).",
                faculty.getId(),
                exception.getStatus()
            );
            return pendingConfirmationResponse(profile, researchProfile, request);
        }
    }

    void synchronizePublicResearchFields(FacultyProfile profile, FacultyAiResearchProfileDto researchProfile) {
        // AI analysis is a confirmed research profile, but the public profile fields may
        // have been curated manually. Only use AI values to seed fields that are empty.
        if ((profile.getResearchInterests() == null || profile.getResearchInterests().isEmpty())
            && researchProfile.research_interests() != null) {
            profile.setResearchInterests(researchProfile.research_interests());
        }
        if ((profile.getResearchDomains() == null || profile.getResearchDomains().isBlank())
            && researchProfile.research_domains() != null
            && !researchProfile.research_domains().isEmpty()) {
            profile.setResearchDomains(String.join(", ", researchProfile.research_domains()));
        }
    }

    @Transactional(readOnly = true)
    public FacultyAiProfileStatusResponse getConfirmedProfile() {
        User faculty = currentFacultyWithProfile();
        FacultyProfile profile = faculty.getFacultyProfile();

        if (!hasConfirmedProfile(profile)) {
            return new FacultyAiProfileStatusResponse(
                faculty.getId(),
                false,
                null,
                null,
                null,
                null,
                "NOT_CONFIRMED"
            );
        }

        try {
            FacultyAiResearchProfileDto researchProfile = objectMapper.readValue(
                profile.getAiResearchProfileJson(), FacultyAiResearchProfileDto.class
            );
            FacultyAiLaymanSummaryDto laymanSummary = profile.getAiLaymanSummaryJson() != null
                ? objectMapper.readValue(profile.getAiLaymanSummaryJson(), FacultyAiLaymanSummaryDto.class)
                : null;
            FacultyAiStatedRequirementsDto statedRequirements = profile.getAiStatedRequirementsJson() != null
                ? objectMapper.readValue(profile.getAiStatedRequirementsJson(), FacultyAiStatedRequirementsDto.class)
                : null;

            return new FacultyAiProfileStatusResponse(
                faculty.getId(),
                true,
                profile.getAiProfileConfirmedAt() != null ? profile.getAiProfileConfirmedAt().toString() : null,
                researchProfile,
                statedRequirements,
                laymanSummary,
                hasPersistedEmbedding(profile) ? "SYNCED" : "PENDING"
            );
        } catch (JsonProcessingException e) {
            logger.error(
                "Could not deserialize the confirmed research profile for faculty {} ({}).",
                faculty.getId(),
                e.getClass().getSimpleName()
            );
            throw new BusinessRuleException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "The saved research profile could not be loaded. Contact support."
            );
        }
    }

    @Transactional
    public FacultyStudentMatchesResponse getStudentMatches(int topK) {
        User faculty = currentFacultyWithProfile();
        FacultyProfile profile = faculty.getFacultyProfile();
        if (!hasConfirmedProfile(profile)) {
            throw new BusinessRuleException(
                HttpStatus.CONFLICT,
                "Confirm your research profile before requesting student matches."
            );
        }

        try {
            ensureMlProfile(faculty, profile);
            for (User student : users.findAllByRole(UserRole.STUDENT)) {
                recommendations.synchronizeStudentProfile(student);
            }
            FacultyStudentMatchesResponse response = mlClient.post()
                .uri("/professor/{id}/match-students", faculty.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("top_k", topK > 0 ? topK : 20))
                .retrieve()
                .body(FacultyStudentMatchesResponse.class);
            if (response == null || response.matches() == null) {
                throw new BusinessRuleException(
                    HttpStatus.BAD_GATEWAY,
                    "The recommendation service returned an invalid student-match response."
                );
            }
            return response;
        } catch (BusinessRuleException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            logger.error(
                "Failed to fetch student matches for faculty {} with HTTP status {}.",
                faculty.getId(),
                exception.getStatusCode().value()
            );
            throw new BusinessRuleException(
                mapUpstreamStatus(exception.getStatusCode().value()),
                "Could not fetch AI student matches from the recommendation service."
            );
        } catch (RestClientException exception) {
            logger.error(
                "Failed to fetch student matches for faculty {} ({}).",
                faculty.getId(),
                exception.getClass().getSimpleName()
            );
            throw new BusinessRuleException(
                isTimeout(exception) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                "Could not fetch AI student matches from the recommendation service."
            );
        }
    }

    @Transactional
    public void synchronizeConfirmedProfiles() {
        List<User> eligibleFaculty = users.findApprovedFacultyWithConfirmedAiResearchProfile(
            UserRole.FACULTY,
            FacultyApprovalStatus.APPROVED
        );
        eligibleFaculty.forEach(faculty -> ensureMlProfile(faculty, faculty.getFacultyProfile()));
        reconcileMlProfiles(eligibleFaculty.stream().map(faculty -> faculty.getId().toString()).toList());
    }

    private void ensureMlProfile(User faculty, FacultyProfile profile) {
        try {
            FacultyAiResearchProfileDto researchProfile = objectMapper.readValue(
                profile.getAiResearchProfileJson(), FacultyAiResearchProfileDto.class
            );
            FacultyAiStatedRequirementsDto statedRequirements = profile.getAiStatedRequirementsJson() == null
                ? null
                : objectMapper.readValue(profile.getAiStatedRequirementsJson(), FacultyAiStatedRequirementsDto.class);
            FacultyAiLaymanSummaryDto laymanSummary = profile.getAiLaymanSummaryJson() == null
                ? null
                : objectMapper.readValue(profile.getAiLaymanSummaryJson(), FacultyAiLaymanSummaryDto.class);
            MlProfileConfirmResponse response = confirmWithMl(
                faculty.getId(),
                researchProfile,
                statedRequirements,
                laymanSummary,
                null,
                readStoredEmbedding(profile),
                profile.getAiProfileConfirmedAt()
            );
            persistEmbedding(profile, response);
            users.saveAndFlush(faculty);
        } catch (JsonProcessingException exception) {
            logger.error(
                "Could not read the confirmed profile for faculty {} ({}).",
                faculty.getId(),
                exception.getClass().getSimpleName()
            );
            throw new BusinessRuleException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "The saved research profile could not be restored."
            );
        }
    }

    private MlProfileConfirmResponse confirmWithMl(
        Long facultyId,
        FacultyAiResearchProfileDto researchProfile,
        FacultyAiStatedRequirementsDto statedRequirements,
        FacultyAiLaymanSummaryDto laymanSummary,
        String draftId,
        List<Double> embedding,
        Instant confirmedAt
    ) {
        String professorId = facultyId.toString();
        MlProfileConfirmResponse response;
        try {
            response = mlClient.put()
                .uri("/professor/{id}/research-profile/confirm", professorId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(new MlProfileConfirmRequest(
                    researchProfile,
                    statedRequirements,
                    laymanSummary,
                    draftId,
                    embedding,
                    RESEARCH_EMBEDDING_MODEL,
                    confirmedAt == null ? null : confirmedAt.toString()
                ))
                .retrieve()
                .body(MlProfileConfirmResponse.class);
        } catch (RestClientResponseException exception) {
            logger.error(
                "ML service profile synchronization failed for faculty {} with HTTP status {}.",
                facultyId,
                exception.getStatusCode().value()
            );
            throw new BusinessRuleException(
                mapUpstreamStatus(exception.getStatusCode().value()),
                confirmationFailureMessage(exception.getStatusCode().value())
            );
        } catch (RestClientException exception) {
            logger.error(
                "ML service profile synchronization failed for faculty {} ({}).",
                facultyId,
                exception.getClass().getSimpleName()
            );
            throw new BusinessRuleException(
                isTimeout(exception) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                isTimeout(exception)
                    ? "Research profile embedding synchronization timed out."
                    : "Could not synchronize the confirmed research profile with the AI service."
            );
        }

        if (response == null
            || !response.isConfirmed()
            || !"confirmed".equals(response.status())
            || !professorId.equals(response.professorId())
            || response.embeddingDimensions() != RESEARCH_EMBEDDING_DIMENSIONS
            || !RESEARCH_EMBEDDING_MODEL.equals(response.embeddingModel())
            || !isValidEmbedding(response.embedding())
            || response.researchProfile() == null) {
            logger.error("ML service returned an invalid embedding confirmation for faculty {}.", facultyId);
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "The recommendation service did not return a valid research embedding."
            );
        }
        return response;
    }

    private void persistEmbedding(FacultyProfile profile, MlProfileConfirmResponse response) {
        try {
            profile.setAiResearchProfileEmbeddingJson(objectMapper.writeValueAsString(response.embedding()));
            profile.setAiResearchEmbeddingModel(response.embeddingModel());
        } catch (JsonProcessingException exception) {
            throw new BusinessRuleException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "The generated research embedding could not be saved."
            );
        }
    }

    private List<Double> readStoredEmbedding(FacultyProfile profile) {
        if (!RESEARCH_EMBEDDING_MODEL.equals(profile.getAiResearchEmbeddingModel())
            || profile.getAiResearchProfileEmbeddingJson() == null) {
            return null;
        }
        try {
            List<Double> embedding = objectMapper.readValue(
                profile.getAiResearchProfileEmbeddingJson(), new TypeReference<>() {}
            );
            if (isValidEmbedding(embedding)) {
                return embedding;
            }
            logger.warn("Ignoring invalid stored research embedding for faculty {}.", profile.getUser().getId());
        } catch (JsonProcessingException exception) {
            logger.warn(
                "Ignoring unreadable stored research embedding for faculty {} ({}).",
                profile.getUser().getId(),
                exception.getClass().getSimpleName()
            );
        }
        return null;
    }

    private boolean hasPersistedEmbedding(FacultyProfile profile) {
        return profile != null
            && RESEARCH_EMBEDDING_MODEL.equals(profile.getAiResearchEmbeddingModel())
            && isValidEmbedding(readStoredEmbedding(profile));
    }

    private boolean isValidEmbedding(List<Double> embedding) {
        if (embedding == null || embedding.size() != RESEARCH_EMBEDDING_DIMENSIONS
            || embedding.stream().anyMatch(value -> value == null || !Double.isFinite(value))) {
            return false;
        }
        double norm = Math.sqrt(embedding.stream().mapToDouble(value -> value * value).sum());
        return Math.abs(norm - 1.0) <= 1e-3;
    }

    private boolean hasConfirmedProfile(FacultyProfile profile) {
        return profile != null
            && Boolean.TRUE.equals(profile.getAiProfileConfirmed())
            && profile.getAiResearchProfileJson() != null
            && !profile.getAiResearchProfileJson().isBlank();
    }

    private User currentFacultyWithProfile() {
        User authenticatedFaculty = currentUser.requireRole(UserRole.FACULTY);
        return users.findByIdAndRole(authenticatedFaculty.getId(), UserRole.FACULTY)
            .orElseThrow(() -> new BusinessRuleException(HttpStatus.NOT_FOUND, "Faculty profile was not found."));
    }

    private FacultyAiResearchProfileDto validateAndNormalizeResearchProfile(
        FacultyAiResearchProfileDto profile
    ) {
        boolean hasResearchContent = hasText(profile.research_interests())
            || hasText(profile.research_domains())
            || hasText(profile.research_experience())
            || hasText(profile.methods())
            || hasText(profile.publications())
            || hasText(profile.contributions());
        if (!hasResearchContent) {
            throw new BusinessRuleException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Add at least one research interest, domain, experience, method, publication, or contribution before confirming."
            );
        }

        String embeddingText = profile.embedding_text() == null ? "" : profile.embedding_text().trim();
        if (embeddingText.isBlank()) {
            List<String> sections = new ArrayList<>();
            addEmbeddingSection(sections, "Research interests", profile.research_interests());
            addEmbeddingSection(sections, "Research domains", profile.research_domains());
            addEmbeddingSection(sections, "Technical skills", profile.technical_skills());
            addEmbeddingSection(sections, "Research experience", profile.research_experience());
            addEmbeddingSection(sections, "Methods", profile.methods());
            addEmbeddingSection(sections, "Publications", profile.publications());
            addEmbeddingSection(sections, "Contributions", profile.contributions());
            embeddingText = String.join(". ", sections);
        }
        if (embeddingText.isBlank()) {
            throw new BusinessRuleException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Add a research narrative before confirming the profile."
            );
        }
        return new FacultyAiResearchProfileDto(
            profile.research_interests(),
            profile.research_domains(),
            profile.technical_skills(),
            profile.research_experience(),
            profile.methods(),
            profile.publications(),
            profile.contributions(),
            embeddingText
        );
    }

    private boolean hasText(List<String> values) {
        return values != null && values.stream().anyMatch(value -> value != null && !value.isBlank());
    }

    private void addEmbeddingSection(List<String> sections, String label, List<String> values) {
        if (hasText(values)) {
            sections.add(label + ": " + String.join(", ", values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList()));
        }
    }

    private FacultyProfileConfirmResponse confirmResponse(
        FacultyProfile profile,
        MlProfileConfirmResponse response,
        FacultyAiStatedRequirementsDto statedRequirements,
        FacultyAiLaymanSummaryDto laymanSummary
    ) {
        return new FacultyProfileConfirmResponse(
            response.professorId(),
            "confirmed",
            true,
            profile.getAiProfileConfirmedAt() == null ? null : profile.getAiProfileConfirmedAt().toString(),
            "Research profile and embedding are saved.",
            response.embeddingDimensions(),
            response.researchProfile(),
            statedRequirements,
            laymanSummary,
            "SYNCED",
            null
        );
    }

    private FacultyProfileConfirmResponse pendingConfirmationResponse(
        FacultyProfile profile,
        FacultyAiResearchProfileDto researchProfile,
        FacultyProfileConfirmRequest request
    ) {
        return new FacultyProfileConfirmResponse(
            profile.getUser().getId().toString(),
            "confirmed",
            true,
            profile.getAiProfileConfirmedAt() == null ? null : profile.getAiProfileConfirmedAt().toString(),
            "Research profile saved; embedding synchronization is pending.",
            0,
            researchProfile,
            request.stated_requirements(),
            request.layman_summary(),
            "PENDING",
            "Your profile is saved. Embedding synchronization will retry when recommendations are requested."
        );
    }

    private void reconcileMlProfiles(List<String> professorIds) {
        try {
            MlConfirmedProfileReconcileResponse response = mlClient.put()
                .uri("/professor/confirmed-profiles/reconcile")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new MlConfirmedProfileReconcileRequest(professorIds))
                .retrieve()
                .body(MlConfirmedProfileReconcileResponse.class);
            if (response == null || response.remainingCount() != professorIds.size()) {
                throw new BusinessRuleException(
                    HttpStatus.BAD_GATEWAY,
                    "The recommendation service could not reconcile its confirmed faculty profiles."
                );
            }
        } catch (BusinessRuleException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            logger.error(
                "Could not reconcile confirmed faculty profiles in ML service (HTTP {}).",
                exception.getStatusCode().value()
            );
            throw new BusinessRuleException(
                mapUpstreamStatus(exception.getStatusCode().value()),
                "Could not synchronize confirmed faculty profiles with the recommendation service."
            );
        } catch (RestClientException exception) {
            logger.error(
                "Could not reconcile confirmed faculty profiles in ML service ({}).",
                exception.getClass().getSimpleName()
            );
            throw new BusinessRuleException(
                isTimeout(exception) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                "Could not synchronize confirmed faculty profiles with the recommendation service."
            );
        }
    }

    private HttpStatus mapUpstreamStatus(int statusCode) {
        return switch (statusCode) {
            case 400 -> HttpStatus.BAD_REQUEST;
            case 413 -> HttpStatus.PAYLOAD_TOO_LARGE;
            case 415 -> HttpStatus.UNSUPPORTED_MEDIA_TYPE;
            case 422 -> HttpStatus.UNPROCESSABLE_ENTITY;
            case 429 -> HttpStatus.TOO_MANY_REQUESTS;
            case 503 -> HttpStatus.SERVICE_UNAVAILABLE;
            case 504 -> HttpStatus.GATEWAY_TIMEOUT;
            default -> HttpStatus.BAD_GATEWAY;
        };
    }

    private String analysisFailureMessage(int statusCode) {
        return switch (statusCode) {
            case 413 -> "The combined research documents exceed the service upload limit.";
            case 415 -> "Upload PDF research documents only.";
            case 422 -> "No readable research text was found, including after OCR.";
            case 429 -> "Groq rate limit reached. Please wait and retry.";
            case 503 -> "AI analysis is not configured. Contact the service administrator.";
            case 504 -> "AI document analysis timed out. Please try again.";
            default -> "AI document analysis failed. Please try again.";
        };
    }

    private String confirmationFailureMessage(int statusCode) {
        return statusCode == 503
            ? "The profile is saved, but AI embedding synchronization is unavailable."
            : "The profile is saved, but AI embedding synchronization failed.";
    }

    private boolean isTimeout(Throwable throwable) {
        for (Throwable cause = throwable; cause != null; cause = cause.getCause()) {
            if (cause instanceof java.net.SocketTimeoutException
                || cause instanceof java.util.concurrent.TimeoutException) {
                return true;
            }
        }
        return throwable.getMessage() != null
            && throwable.getMessage().toLowerCase(Locale.ROOT).contains("timed out");
    }

    private record MlProfileConfirmRequest(
        @JsonProperty("research_profile") FacultyAiResearchProfileDto researchProfile,
        @JsonProperty("stated_requirements") FacultyAiStatedRequirementsDto statedRequirements,
        @JsonProperty("layman_summary") FacultyAiLaymanSummaryDto laymanSummary,
        @JsonProperty("draft_id") String draftId,
        @JsonProperty("embedding") List<Double> embedding,
        @JsonProperty("embedding_model") String embeddingModel,
        @JsonProperty("confirmed_at") String confirmedAt
    ) {}

    private record MlProfileConfirmResponse(
        @JsonProperty("professor_id") String professorId,
        @JsonProperty("status") String status,
        @JsonProperty("is_confirmed") boolean isConfirmed,
        @JsonProperty("confirmed_at") String confirmedAt,
        @JsonProperty("message") String message,
        @JsonProperty("embedding_dimensions") int embeddingDimensions,
        @JsonProperty("research_profile") FacultyAiResearchProfileDto researchProfile,
        @JsonProperty("stated_requirements") FacultyAiStatedRequirementsDto statedRequirements,
        @JsonProperty("layman_summary") FacultyAiLaymanSummaryDto laymanSummary,
        @JsonProperty("embedding") List<Double> embedding,
        @JsonProperty("embedding_model") String embeddingModel
    ) {}

    private record MlConfirmedProfileReconcileRequest(
        @JsonProperty("professor_ids") List<String> professorIds
    ) {}

    private record MlConfirmedProfileReconcileResponse(
        @JsonProperty("removed_ids") List<String> removedIds,
        @JsonProperty("remaining_count") int remainingCount
    ) {}
}
