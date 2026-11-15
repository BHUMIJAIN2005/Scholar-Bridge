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
import java.time.Instant;
import java.util.List;
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
import org.springframework.web.multipart.MultipartFile;

@Service
public class FacultyResearchProfileService {
    private static final Logger logger = LoggerFactory.getLogger(FacultyResearchProfileService.class);

    private final RestClient mlClient;
    private final CurrentUserService currentUser;
    private final UserRepository users;
    private final ObjectMapper objectMapper;

    public FacultyResearchProfileService(
        RestClient mlClient,
        CurrentUserService currentUser,
        UserRepository users,
        ObjectMapper objectMapper
    ) {
        this.mlClient = mlClient;
        this.currentUser = currentUser;
        this.users = users;
        this.objectMapper = objectMapper;
    }

    public FacultyAiAnalysisResponse analyzeDocuments(List<MultipartFile> files, List<String> documentTypes) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);

        if (files == null || files.isEmpty()) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Please upload at least one PDF file.");
        }

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        for (MultipartFile file : files) {
            String name = file.getOriginalFilename() == null ? "document.pdf" : file.getOriginalFilename();
            try {
                ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
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
            return mlClient.post()
                .uri("/professor/analyze-documents")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(FacultyAiAnalysisResponse.class);
        } catch (RestClientException exc) {
            logger.error("ML service document analysis failed for faculty {}: {}", faculty.getId(), exc.getMessage());
            String message = exc.getMessage();
            if (message != null && message.contains("429")) {
                throw new BusinessRuleException(HttpStatus.TOO_MANY_REQUESTS, "Groq API rate limit reached. Please wait a moment and try again.");
            }
            throw new BusinessRuleException(HttpStatus.BAD_GATEWAY, "Could not complete AI document analysis: " + exc.getMessage());
        }
    }

    @Transactional
    public FacultyProfileConfirmResponse confirmProfile(FacultyProfileConfirmRequest request) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        FacultyProfile profile = faculty.getFacultyProfile();
        if (profile == null) {
            profile = new FacultyProfile();
            profile.setUser(faculty);
            faculty.setFacultyProfile(profile);
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
        } catch (RestClientException exc) {
            logger.error("ML service profile confirmation failed for faculty {}: {}", faculty.getId(), exc.getMessage());
            throw new BusinessRuleException(HttpStatus.BAD_GATEWAY, "Failed to confirm profile with ML service: " + exc.getMessage());
        }

        // 2. Persist confirmed JSON and sync fields into Spring Boot database
        try {
            if (request.research_profile() != null) {
                profile.setAiResearchProfileJson(objectMapper.writeValueAsString(request.research_profile()));
                if (request.research_profile().research_interests() != null) {
                    profile.setResearchInterests(request.research_profile().research_interests());
                }
                if (request.research_profile().research_domains() != null && !request.research_profile().research_domains().isEmpty()) {
                    profile.setResearchDomains(String.join(", ", request.research_profile().research_domains()));
                }
            }
            if (request.layman_summary() != null) {
                profile.setAiLaymanSummaryJson(objectMapper.writeValueAsString(request.layman_summary()));
            }
            if (request.stated_requirements() != null) {
                profile.setAiStatedRequirementsJson(objectMapper.writeValueAsString(request.stated_requirements()));
            }
        } catch (JsonProcessingException e) {
            logger.warn("Could not serialize research profile JSON for faculty {}", faculty.getId(), e);
        }

        profile.setAiProfileConfirmed(true);
        profile.setAiProfileConfirmedAt(Instant.now());
        users.save(faculty);

        logger.info("Successfully persisted confirmed AI research profile for faculty id {}", faculty.getId());
        return mlResponse;
    }

    @Transactional(readOnly = true)
    public FacultyAiProfileStatusResponse getConfirmedProfile() {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        FacultyProfile profile = faculty.getFacultyProfile();

        if (profile == null || Boolean.FALSE.equals(profile.getAiProfileConfirmed()) || profile.getAiResearchProfileJson() == null) {
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

    public FacultyStudentMatchesResponse getStudentMatches(int topK) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);

        try {
            return mlClient.post()
                .uri("/professor/{id}/match-students", faculty.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("top_k", topK > 0 ? topK : 20))
                .retrieve()
                .body(FacultyStudentMatchesResponse.class);
        } catch (RestClientException exc) {
            logger.error("Failed to fetch student matches for faculty {}: {}", faculty.getId(), exc.getMessage());
            throw new BusinessRuleException(HttpStatus.BAD_GATEWAY, "Could not fetch AI student matches: " + exc.getMessage());
        }
    }
}
