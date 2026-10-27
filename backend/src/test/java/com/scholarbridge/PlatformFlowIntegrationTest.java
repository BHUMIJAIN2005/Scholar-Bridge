package com.scholarbridge;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    @Test
    void signupApplyAndFacultyReviewRequireCorrectRolesAndOwnership() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String facultyToken = signup("faculty-" + suffix + "@example.edu", "FACULTY", Map.of(
            "department", "Computer Science", "researchDomains", "Machine Learning, NLP"));
        String studentToken = signup("student-" + suffix + "@example.edu", "STUDENT", Map.of(
            "skills", "Python, NLP", "year", "Third year"));

        ResponseEntity<String> openingResponse = exchange(
            "/api/openings", HttpMethod.POST, facultyToken,
            Map.of("title", "Language Models", "description", "Research project description for students.",
                "requiredSkills", "Python, NLP", "seats", 2));
        assertThat(openingResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        long openingId = objectMapper.readTree(openingResponse.getBody()).get("id").asLong();

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