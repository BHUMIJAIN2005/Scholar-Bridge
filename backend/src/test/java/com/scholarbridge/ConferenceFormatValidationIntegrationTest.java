package com.scholarbridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.dto.ApiDtos.ConferenceFormatValidationResult;
import com.scholarbridge.entity.Conference;
import com.scholarbridge.entity.ConferenceSubmission;
import com.scholarbridge.entity.PaperStatus;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.ConferenceRepository;
import com.scholarbridge.repository.ConferenceSubmissionRepository;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.service.ConferenceFormatValidationService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "app.seed.enabled=false"
)
class ConferenceFormatValidationIntegrationTest {
    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository users;

    @Autowired
    private ConferenceRepository conferences;

    @Autowired
    private PaperSubmissionRepository papers;

    @Autowired
    private ConferenceSubmissionRepository submissions;

    @MockitoBean
    private ConferenceFormatValidationService formatValidation;

    @Test
    void persistsAndReturnsFormatReportEvenWhenScreeningFindsIssues() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String studentToken = signup("student-" + suffix + "@example.org", "STUDENT", Map.of());
        String facultyToken = signup("faculty-" + suffix + "@example.org", "FACULTY", Map.of(
            "department", "Computer Science",
            "researchDomains", "Artificial Intelligence"
        ));
        User student = users.findByEmailIgnoreCase("student-" + suffix + "@example.org").orElseThrow();
        User faculty = users.findByEmailIgnoreCase("faculty-" + suffix + "@example.org").orElseThrow();
        Conference conference = createConference(faculty);
        PaperSubmission paper = createPaper(student);
        ConferenceFormatValidationResult report = new ConferenceFormatValidationResult(
            false,
            List.of("Two-column layout could not be detected."),
            List.of("Times-style fonts were not detected."),
            2,
            List.of("Helvetica"),
            List.of("abstract", "references"),
            "paper-" + paper.getId() + ".pdf",
            "preliminary_ieee_format_check"
        );
        when(formatValidation.validate(any(PaperSubmission.class))).thenReturn(report);

        ResponseEntity<String> submit = exchange(
            "/api/conferences/" + conference.getId() + "/submit",
            HttpMethod.POST,
            studentToken,
            Map.of("paperId", paper.getId(), "track", "Artificial Intelligence", "allowPublicPdf", false)
        );

        assertThat(submit.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode submitted = objectMapper.readTree(submit.getBody());
        assertThat(submitted.get("formatValidation").get("passed").asBoolean()).isFalse();
        assertThat(submitted.get("formatValidation").get("pageCount").asInt()).isEqualTo(2);
        assertThat(submitted.get("status").asText()).isEqualTo("SUBMITTED");
        ConferenceSubmission persisted = submissions.findAll().stream()
            .filter(candidate -> candidate.getPaper().getId().equals(paper.getId())
                && candidate.getConference().getId().equals(conference.getId()))
            .findFirst()
            .orElseThrow();
        assertThat(persisted.getFormatValidationJson()).contains("preliminary_ieee_format_check");

        ResponseEntity<String> reviewList = exchange(
            "/api/conferences/" + conference.getId() + "/submissions",
            HttpMethod.GET,
            facultyToken,
            null
        );
        assertThat(reviewList.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(objectMapper.readTree(reviewList.getBody()).get(0).get("formatValidation").get("warnings").get(0).asText())
            .contains("Times-style fonts");
        verify(formatValidation).validate(any(PaperSubmission.class));
    }

    @Test
    void validatorFailureDoesNotSaveSubmissionAndInvalidTrackDoesNotCallValidator() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String studentToken = signup("student-" + suffix + "@example.org", "STUDENT", Map.of());
        User student = users.findByEmailIgnoreCase("student-" + suffix + "@example.org").orElseThrow();
        Conference conference = createConference(createFaculty(suffix));
        PaperSubmission paper = createPaper(student);

        ResponseEntity<String> invalidTrack = exchange(
            "/api/conferences/" + conference.getId() + "/submit",
            HttpMethod.POST,
            studentToken,
            Map.of("paperId", paper.getId(), "track", "Invalid", "allowPublicPdf", false)
        );
        assertThat(invalidTrack.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        verifyNoInteractions(formatValidation);

        doThrow(new BusinessRuleException(HttpStatus.BAD_GATEWAY, "Format service unavailable. Submission not saved."))
            .when(formatValidation).validate(any(PaperSubmission.class));
        ResponseEntity<String> unavailable = exchange(
            "/api/conferences/" + conference.getId() + "/submit",
            HttpMethod.POST,
            studentToken,
            Map.of("paperId", paper.getId(), "track", "Artificial Intelligence", "allowPublicPdf", false)
        );

        assertThat(unavailable.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(submissions.existsByPaperIdAndConferenceId(paper.getId(), conference.getId())).isFalse();
    }

    private Conference createConference(User faculty) {
        Conference conference = new Conference();
        conference.setCreatedBy(faculty);
        conference.setName("Format Integration Conference");
        conference.setDepartment("Computer Science");
        conference.setSubmissionDeadline(Instant.now().plusSeconds(3600));
        conference.setEventDate(Instant.now().plusSeconds(7200));
        conference.setTracks(List.of("Artificial Intelligence"));
        return conferences.saveAndFlush(conference);
    }

    private PaperSubmission createPaper(User student) {
        PaperSubmission paper = new PaperSubmission();
        paper.setStudent(student);
        paper.setTitle("Synthetic Paper");
        paper.setStoredFilename(UUID.randomUUID() + ".pdf");
        paper.setStatus(PaperStatus.DONE);
        return papers.saveAndFlush(paper);
    }

    private User createFaculty(String suffix) throws Exception {
        signup("owner-" + suffix + "@example.org", "FACULTY", Map.of(
            "department", "Computer Science",
            "researchDomains", "Artificial Intelligence"
        ));
        return users.findByEmailIgnoreCase("owner-" + suffix + "@example.org").orElseThrow();
    }

    private String signup(String email, String role, Map<String, String> profile) throws Exception {
        var request = new java.util.HashMap<String, Object>();
        request.put("name", "Conference Test User");
        request.put("email", email);
        request.put("password", "test-password-123");
        request.put("role", role);
        request.putAll(profile);
        ResponseEntity<String> response = exchange("/api/auth/signup", HttpMethod.POST, null, request);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return objectMapper.readTree(response.getBody()).get("token").asText();
    }

    private ResponseEntity<String> exchange(String path, HttpMethod method, String token, Object body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) headers.setBearerAuth(token);
        return rest.exchange(
            "http://localhost:" + port + path,
            method,
            new HttpEntity<>(body, headers),
            String.class
        );
    }
}
