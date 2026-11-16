package com.scholarbridge.service;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.scholarbridge.dto.ApiDtos.ConferenceFormatValidationResult;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.exception.BusinessRuleException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

@Service
public class ConferenceFormatValidationService {
    private static final Logger logger = LoggerFactory.getLogger(ConferenceFormatValidationService.class);
    private static final long MAX_PAPER_SIZE = 20L * 1024 * 1024;
    private static final String VALIDATION_UNAVAILABLE =
        "Conference format screening is unavailable. The submission was not saved.";

    private final RestClient mlClient;
    private final Path uploadDirectory;

    public ConferenceFormatValidationService(
        RestClient mlClient,
        @Value("${app.uploads.directory}") String uploadDirectory
    ) {
        this.mlClient = mlClient;
        this.uploadDirectory = Paths.get(uploadDirectory).toAbsolutePath().normalize();
    }

    public ConferenceFormatValidationResult validate(PaperSubmission paper) {
        byte[] pdf = readPaper(paper);
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(pdf) {
            @Override
            public String getFilename() {
                return "paper-" + paper.getId() + ".pdf";
            }
        });

        MlFormatValidationResponse response;
        try {
            response = mlClient.post()
                .uri("/validate-format")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(MlFormatValidationResponse.class);
        } catch (RestClientResponseException exception) {
            logger.error(
                "Conference format screening returned HTTP status {} for paper {}.",
                exception.getStatusCode().value(),
                paper.getId(),
                exception
            );
            throw new BusinessRuleException(
                upstreamStatus(exception.getStatusCode().value()),
                "Conference format screening could not validate this paper. The submission was not saved."
            );
        } catch (RestClientException exception) {
            logger.error("Conference format screening is unavailable for paper {}.", paper.getId(), exception);
            throw new BusinessRuleException(HttpStatus.BAD_GATEWAY, VALIDATION_UNAVAILABLE);
        }

        if (response == null
            || response.passed() == null
            || response.pageCount() == null
            || response.pageCount() < 0
            || response.errors() == null
            || response.warnings() == null
            || response.detectedFonts() == null
            || response.detectedSections() == null
            || response.filename() == null
            || response.validationType() == null) {
            logger.error("Conference format screening returned an invalid response for paper {}.", paper.getId());
            throw new BusinessRuleException(HttpStatus.BAD_GATEWAY, VALIDATION_UNAVAILABLE);
        }

        return new ConferenceFormatValidationResult(
            response.passed(),
            List.copyOf(response.errors()),
            List.copyOf(response.warnings()),
            response.pageCount(),
            List.copyOf(response.detectedFonts()),
            List.copyOf(response.detectedSections()),
            response.filename(),
            response.validationType()
        );
    }

    private byte[] readPaper(PaperSubmission paper) {
        if (paper.getStoredFilename() == null || paper.getStoredFilename().isBlank()) {
            throw new BusinessRuleException(HttpStatus.NOT_FOUND, "The stored paper file is unavailable.");
        }

        Path candidate = uploadDirectory.resolve(paper.getStoredFilename()).normalize();
        if (!candidate.startsWith(uploadDirectory) || !Files.isRegularFile(candidate)) {
            throw new BusinessRuleException(HttpStatus.NOT_FOUND, "The stored paper file is unavailable.");
        }

        try {
            Path realDirectory = uploadDirectory.toRealPath();
            Path realFile = candidate.toRealPath();
            if (!realFile.startsWith(realDirectory) || !Files.isRegularFile(realFile)) {
                throw new BusinessRuleException(HttpStatus.NOT_FOUND, "The stored paper file is unavailable.");
            }
            if (Files.size(realFile) > MAX_PAPER_SIZE) {
                throw new BusinessRuleException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "Research papers must be 20 MB or smaller."
                );
            }
            byte[] bytes = Files.readAllBytes(realFile);
            if (bytes.length < 5
                || !new String(bytes, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-")) {
                throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "The stored paper is not a valid PDF.");
            }
            return bytes;
        } catch (IOException exception) {
            logger.error("Could not read the stored paper PDF {}.", paper.getId(), exception);
            throw new BusinessRuleException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "The stored paper file could not be read."
            );
        }
    }

    private HttpStatus upstreamStatus(int statusCode) {
        return switch (statusCode) {
            case 400 -> HttpStatus.BAD_REQUEST;
            case 413 -> HttpStatus.PAYLOAD_TOO_LARGE;
            case 415 -> HttpStatus.UNSUPPORTED_MEDIA_TYPE;
            default -> HttpStatus.BAD_GATEWAY;
        };
    }

    private record MlFormatValidationResponse(
        Boolean passed,
        List<String> errors,
        List<String> warnings,
        @JsonAlias("page_count") Integer pageCount,
        @JsonAlias("detected_fonts") List<String> detectedFonts,
        @JsonAlias("detected_sections") List<String> detectedSections,
        String filename,
        @JsonAlias("validation_type") String validationType
    ) {}
}
