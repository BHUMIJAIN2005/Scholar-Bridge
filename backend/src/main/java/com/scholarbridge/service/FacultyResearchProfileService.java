package com.scholarbridge.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.dto.ApiDtos.FacultyAiAnalysisResponse;
import com.scholarbridge.dto.ApiDtos.FacultyAiLaymanSummaryDto;
import com.scholarbridge.dto.ApiDtos.FacultyAiProfileStatusResponse;
import com.scholarbridge.dto.ApiDtos.FacultyAiResearchProfileDto;
import com.scholarbridge.dto.ApiDtos.FacultyAiStatedRequirementsDto;
import com.scholarbridge.dto.ApiDtos.FacultyProfileConfirmRequest;
import com.scholarbridge.dto.ApiDtos.FacultyProfileConfirmResponse;
import com.scholarbridge.dto.ApiDtos.FacultyStudentMatchesResponse;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.CurrentUserService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        if (request.research_profile() == null) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "A research profile is required for confirmation.");
        }
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
            researchProfileJson = objectMapper.writeValueAsString(request.research_profile());
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

        // 1. Communicate with ML microservice to generate 384-dim normalized embedding and confirm
        FacultyProfileConfirmResponse mlResponse;
        try {
            mlResponse = mlClient.put()
                .uri("/professor/{id}/research-profile/confirm", faculty.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(FacultyProfileConfirmResponse.class);
        } catch (RestClientResponseException exception) {
            logger.error(
                "ML service profile confirmation failed for faculty {} with HTTP status {}.",
                faculty.getId(),
                exception.getStatusCode().value()
            );
            throw new BusinessRuleException(
                mapUpstreamStatus(exception.getStatusCode().value()),
                confirmationFailureMessage(exception.getStatusCode().value())
            );
        } catch (RestClientException exception) {
            logger.error(
                "ML service profile confirmation failed for faculty {} ({}).",
                faculty.getId(),
                exception.getClass().getSimpleName()
            );
            throw new BusinessRuleException(
                isTimeout(exception) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                isTimeout(exception)
                    ? "Research profile confirmation timed out. Please retry."
                    : "Could not confirm the research profile with the AI service."
            );
        }
        if (mlResponse == null
            || !mlResponse.is_confirmed()
            || !"confirmed".equals(mlResponse.status())
            || !String.valueOf(faculty.getId()).equals(mlResponse.professor_id())
            || mlResponse.embedding_dimensions() != 384) {
            logger.error("ML service returned an invalid confirmation for faculty {}.", faculty.getId());
            throw new BusinessRuleException(
                HttpStatus.BAD_GATEWAY,
                "The AI service did not generate a valid 384-dimensional profile embedding."
            );
        }

        // 2. Persist confirmed JSON and sync fields into Spring Boot database
        profile.setAiResearchProfileJson(researchProfileJson);
        synchronizePublicResearchFields(profile, request.research_profile());
        profile.setAiLaymanSummaryJson(laymanSummaryJson);
        profile.setAiStatedRequirementsJson(statedRequirementsJson);
        profile.setAiProfileConfirmed(true);
        profile.setAiProfileConfirmedAt(Instant.now());
        users.save(faculty);

        logger.info("Successfully persisted confirmed AI research profile for faculty id {}", faculty.getId());
        return mlResponse;
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
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        FacultyProfile profile = faculty.getFacultyProfile();

        if (profile == null || !Boolean.TRUE.equals(profile.getAiProfileConfirmed()) || profile.getAiResearchProfileJson() == null) {
            return new FacultyAiProfileStatusResponse(
                faculty.getId(),
                false,
                null,
                null,
                null,
                null
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
                laymanSummary
            );
        } catch (JsonProcessingException e) {
            logger.error("Error deserializing stored AI profile for faculty {}: {}", faculty.getId(), e.getMessage());
            return new FacultyAiProfileStatusResponse(
                faculty.getId(),
                false,
                null,
                null,
                null,
                null
            );
        }
    }

    @Transactional(readOnly = true)
    public FacultyStudentMatchesResponse getStudentMatches(int topK) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        FacultyProfile profile = faculty.getFacultyProfile();
        if (profile == null
            || !Boolean.TRUE.equals(profile.getAiProfileConfirmed())
            || profile.getAiResearchProfileJson() == null) {
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

    private void ensureMlProfile(User faculty, FacultyProfile profile) {
        String professorId = String.valueOf(faculty.getId());
        try {
            mlClient.get()
                .uri("/professor/{id}/research-profile", professorId)
                .retrieve()
                .toBodilessEntity();
            return;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode() != HttpStatus.NOT_FOUND) {
                throw new BusinessRuleException(
                    mapUpstreamStatus(exception.getStatusCode().value()),
                    "Could not verify the confirmed profile in the recommendation service."
                );
            }
        } catch (RestClientException exception) {
            throw new BusinessRuleException(
                isTimeout(exception) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                "Could not verify the confirmed profile in the recommendation service."
            );
        }

        try {
            FacultyProfileConfirmRequest savedProfile = new FacultyProfileConfirmRequest(
                objectMapper.readValue(profile.getAiResearchProfileJson(), FacultyAiResearchProfileDto.class),
                profile.getAiStatedRequirementsJson() == null
                    ? null
                    : objectMapper.readValue(profile.getAiStatedRequirementsJson(), FacultyAiStatedRequirementsDto.class),
                profile.getAiLaymanSummaryJson() == null
                    ? null
                    : objectMapper.readValue(profile.getAiLaymanSummaryJson(), FacultyAiLaymanSummaryDto.class),
                null
            );
            FacultyProfileConfirmResponse response = mlClient.put()
                .uri("/professor/{id}/research-profile/confirm", professorId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(savedProfile)
                .retrieve()
                .body(FacultyProfileConfirmResponse.class);
            if (response == null
                || !response.is_confirmed()
                || response.embedding_dimensions() != 384
                || !professorId.equals(response.professor_id())) {
                throw new BusinessRuleException(
                    HttpStatus.BAD_GATEWAY,
                    "The recommendation service could not restore the confirmed research embedding."
                );
            }
        } catch (JsonProcessingException exception) {
            throw new BusinessRuleException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "The saved research profile could not be restored."
            );
        } catch (RestClientResponseException exception) {
            throw new BusinessRuleException(
                mapUpstreamStatus(exception.getStatusCode().value()),
                "The recommendation service could not restore the confirmed research embedding."
            );
        } catch (RestClientException exception) {
            throw new BusinessRuleException(
                isTimeout(exception) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                "The recommendation service could not restore the confirmed research embedding."
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
            ? "AI embedding generation is unavailable. The profile was not confirmed."
            : "AI embedding generation failed. The profile was not confirmed.";
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
}
