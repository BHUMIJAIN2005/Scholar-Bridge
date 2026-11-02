package com.scholarbridge;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.entity.Conference;
import com.scholarbridge.entity.ConferenceSubmission;
import com.scholarbridge.entity.PaperStatus;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.SubmissionStatus;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.repository.ConferenceRepository;
import com.scholarbridge.repository.ConferenceSubmissionRepository;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.UserRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "app.seed.enabled=false"
)
class PlatformFlowIntegrationTest {
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

    @Value("${app.uploads.directory}")
    private String uploadDirectory;

    @Test
    void signupApplyAndFacultyReviewRequireCorrectRolesAndOwnership() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String facultyToken = signup("faculty-" + suffix + "@example.edu", "FACULTY", Map.of(
            "department", "Computer Science", "researchDomains", "Machine Learning, NLP"));
        String studentToken = signup("student-" + suffix + "@example.edu", "STUDENT", Map.of(
            "skills", "Python, NLP", "year", "Third year"));
        ResponseEntity<String> invalidPaperUpload = exchange(
            "/api/papers/upload", HttpMethod.POST, studentToken, Map.of("title", "Paper"));
        assertThat(invalidPaperUpload.getStatusCode()).isEqualTo(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        String longDescription = "This lab studies how neural networks and transfer learning can classify plant diseases from limited labeled image datasets. "
            .repeat(5).trim();

        ResponseEntity<String> openingResponse = exchange(
            "/api/openings", HttpMethod.POST, facultyToken,
            Map.of("title", "Language Models", "description", longDescription,
                "requiredSkills", "Python, NLP", "seats", 2));
        assertThat(openingResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode opening = objectMapper.readTree(openingResponse.getBody());
        long openingId = opening.get("id").asLong();
        assertThat(opening.get("description").asText()).isEqualTo(longDescription);

        ResponseEntity<String> applyResponse = exchange(
            "/api/applications", HttpMethod.POST, studentToken,
            Map.of("openingId", openingId, "statementOfInterest", "I have experience in NLP and want to contribute to this research."));
        assertThat(applyResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        long applicationId = objectMapper.readTree(applyResponse.getBody()).get("id").asLong();

        ResponseEntity<String> duplicate = exchange(
            "/api/applications", HttpMethod.POST, studentToken,
            Map.of("openingId", openingId, "statementOfInterest", "I have experience in NLP and want to contribute again."));
        assertThat(duplicate.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        ResponseEntity<String> applicants = exchange(
            "/api/openings/" + openingId + "/applicants", HttpMethod.GET, facultyToken, null);
        assertThat(applicants.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode applicantList = objectMapper.readTree(applicants.getBody());
        assertThat(applicantList).hasSize(1);
        assertThat(applicantList.get(0).get("studentEmail").asText()).contains("student-");

        ResponseEntity<String> decision = exchange(
            "/api/applications/" + applicationId + "/status", HttpMethod.PUT, facultyToken,
            Map.of("status", "ACCEPTED"));
        assertThat(decision.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(objectMapper.readTree(decision.getBody()).get("status").asText()).isEqualTo("ACCEPTED");

        ResponseEntity<String> forbidden = exchange(
            "/api/applications/" + applicationId + "/status", HttpMethod.PUT, studentToken,
            Map.of("status", "REJECTED"));
        assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void publicPdfRequiresAcceptanceAndExplicitAuthorPermission() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        User student = createUser("public-paper-" + suffix + "@example.edu", UserRole.STUDENT);
        User faculty = createUser("public-faculty-" + suffix + "@example.edu", UserRole.FACULTY);
        Conference conference = new Conference();
        conference.setCreatedBy(faculty);
        conference.setName("Research Conference");
        conference.setDepartment("Computer Science");
        conference.setSubmissionDeadline(Instant.now().plusSeconds(3600));
        conference.setEventDate(Instant.now().plusSeconds(7200));
        conference.setTracks(List.of("Artificial Intelligence"));
        conference = conferences.saveAndFlush(conference);

        Path directory = Paths.get(uploadDirectory).toAbsolutePath().normalize();
        Files.createDirectories(directory);
        String filename = UUID.randomUUID() + ".pdf";
        Path file = directory.resolve(filename);
        byte[] pdfBytes = "%PDF-1.4 test".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        Files.write(file, pdfBytes);
        try {
            long permittedId = createSubmission(student, conference, filename, SubmissionStatus.ACCEPTED, true);
            long privateId = createSubmission(student, conference, filename, SubmissionStatus.ACCEPTED, false);
            long unacceptedId = createSubmission(student, conference, filename, SubmissionStatus.SUBMITTED, true);

            ResponseEntity<String> showcaseResponse = rest.getForEntity(
                "http://localhost:" + port + "/api/conferences/" + conference.getId() + "/showcase",
                String.class);
            assertThat(showcaseResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
            JsonNode showcase = objectMapper.readTree(showcaseResponse.getBody());
            JsonNode permittedRecord = null;
            JsonNode privateRecord = null;
            for (JsonNode record : showcase) {
                if (record.get("id").asLong() == permittedId) permittedRecord = record;
                if (record.get("id").asLong() == privateId) privateRecord = record;
            }
            assertThat(permittedRecord).isNotNull();
            assertThat(permittedRecord.get("publicPdfUrl").asText())
                .isEqualTo("/api/public/conference-submissions/" + permittedId + "/paper");
            assertThat(permittedRecord.get("abstractText").asText()).isEqualTo("Student-written abstract.");
            assertThat(privateRecord).isNotNull();
            assertThat(privateRecord.get("publicPdfUrl").isNull()).isTrue();

            ResponseEntity<byte[]> permitted = rest.getForEntity(
                "http://localhost:" + port + "/api/public/conference-submissions/" + permittedId + "/paper",
                byte[].class);
            assertThat(permitted.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(permitted.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PDF);
            assertThat(permitted.getBody()).isEqualTo(pdfBytes);

            ResponseEntity<String> privatePaper = rest.getForEntity(
                "http://localhost:" + port + "/api/public/conference-submissions/" + privateId + "/paper",
                String.class);
            assertThat(privatePaper.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

            ResponseEntity<String> unacceptedPaper = rest.getForEntity(
                "http://localhost:" + port + "/api/public/conference-submissions/" + unacceptedId + "/paper",
                String.class);
            assertThat(unacceptedPaper.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

            ResponseEntity<String> privateRoute = rest.getForEntity(
                "http://localhost:" + port + "/api/files/999999", String.class);
            assertThat(privateRoute.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        } finally {
            Files.deleteIfExists(file);
        }
    }

    private User createUser(String email, UserRole role) {
        User user = new User();
        user.setName("Integration User");
        user.setEmail(email);
        user.setPasswordHash("not-used");
        user.setRole(role);
        return users.saveAndFlush(user);
    }

    private long createSubmission(
        User student,
        Conference conference,
        String filename,
        SubmissionStatus status,
        boolean allowPublicPdf
    ) {
        PaperSubmission paper = new PaperSubmission();
        paper.setStudent(student);
        paper.setTitle("Research paper");
        paper.setAbstractText("Student-written abstract.");
        paper.setStoredFilename(filename);
        paper.setStatus(PaperStatus.DONE);
        paper = papers.saveAndFlush(paper);

        ConferenceSubmission submission = new ConferenceSubmission();
        submission.setPaper(paper);
        submission.setConference(conference);
        submission.setTrack("Artificial Intelligence");
        submission.setStatus(status);
        submission.setPublicPdfAllowed(allowPublicPdf);
        return submissions.saveAndFlush(submission).getId();
    }

    private String signup(String email, String role, Map<String, String> profile) throws Exception {
        var request = new java.util.HashMap<String, Object>();
        request.put("name", "Integration User");
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
        return rest.exchange("http://localhost:" + port + path, method, new HttpEntity<>(body, headers), String.class);
    }
}