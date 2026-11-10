package com.scholarbridge;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.entity.PaperStatus;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.User;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.UserRepository;
import java.util.HashMap;
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

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "app.seed.enabled=false")
class ProfileDirectoryIntegrationTest {
    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository users;

    @Autowired
    private PaperSubmissionRepository papers;

    @Test
    void managesRichProfilesAndEnforcesStudentDirectoryVisibility() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String facultyToken = signup("faculty-" + suffix + "@example.edu", "FACULTY");
        String studentToken = signup("student-" + suffix + "@example.edu", "STUDENT");

        Map<String, Object> facultyUpdate = new HashMap<>();
        facultyUpdate.putAll(Map.ofEntries(
            Map.entry("photoUrl", "https://example.edu/faculty.png"),
            Map.entry("designation", "Associate Professor"),
            Map.entry("qualifications", "PhD Computer Science"),
            Map.entry("bio", "Researches trustworthy machine learning."),
            Map.entry("department", "Computer Science"),
            Map.entry("researchInterests", new String[] {"Machine Learning", "NLP"}),
            Map.entry("officeRoom", "Room 201"),
            Map.entry("officeHours", "Tuesday 10:00-12:00"),
            Map.entry("scholarUrl", "https://scholar.google.com/citations?user=example"),
            Map.entry("citationsCount", 100),
            Map.entry("hIndex", 5),
            Map.entry("i10Index", 3),
            Map.entry("statsAsOf", "2026-10-01"),
            Map.entry("acceptingStudents", true),
            Map.entry("education", new Object[] {Map.of("degree", "PhD", "institution", "MITS", "year", "2018")}),
            Map.entry("awards", new String[] {"Research Award"}),
            Map.entry("facultyProjects", new Object[] {Map.of("title", "Trustworthy AI", "fundingAgency", "MITS", "years", "2025-2026", "role", "Lead")})
        ));
        JsonNode facultyProfile = objectMapper.readTree(
            exchange("/api/profile/me", HttpMethod.PUT, facultyToken, facultyUpdate).getBody());
        long facultyId = facultyProfile.get("id").asLong();
        assertThat(facultyProfile.get("name").asText()).isEqualTo("faculty-" + suffix);
        assertThat(facultyProfile.get("profileCompleteness").asInt()).isBetween(1, 100);
        assertThat(facultyProfile.get("researchInterests").toString()).contains("Machine Learning");
        assertThat(facultyProfile.get("education").get(0).get("institution").asText()).isEqualTo("MITS");

        ResponseEntity<String> facultyDirectory = exchange(
            "/api/faculty?q=faculty-" + suffix, HttpMethod.GET, studentToken, null);
        assertThat(facultyDirectory.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(containsId(objectMapper.readTree(facultyDirectory.getBody()).get("content"), facultyId))
            .as("Faculty directory response: %s", facultyDirectory.getBody())
            .isTrue();
        JsonNode filteredFaculty = objectMapper.readTree(exchange(
            "/api/faculty?q=faculty-" + suffix + "&researchArea=machine", HttpMethod.GET, studentToken, null
        ).getBody());
        assertThat(containsId(filteredFaculty.get("content"), facultyId))
            .as("Filtered faculty directory response: %s", filteredFaculty)
            .isTrue();

        ResponseEntity<String> facultyDetail = exchange(
            "/api/faculty/" + facultyId, HttpMethod.GET, studentToken, null);
        assertThat(facultyDetail.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(objectMapper.readTree(facultyDetail.getBody()).get("openOpenings")).isEmpty();

        ResponseEntity<String> studentUpdate = exchange("/api/profile/me", HttpMethod.PUT, studentToken, Map.of(
            "year", "Third year",
            "skills", "Python, NLP",
            "skillTags", new String[] {"Python", "NLP"},
            "interests", new String[] {"Machine Learning"},
            "studentProjects", new Object[] {Map.of("title", "Paper matcher", "description", "A research matching prototype.")},
            "githubUrl", "https://github.com/example",
            "visibility", "APPLIED_FACULTY_ONLY"
        ));
        assertThat(studentUpdate.getStatusCode()).isEqualTo(HttpStatus.OK);
        long studentId = objectMapper.readTree(studentUpdate.getBody()).get("id").asLong();
        User student = users.findById(studentId).orElseThrow();
        PaperSubmission paper = new PaperSubmission();
        paper.setStudent(student);
        paper.setTitle("Research paper");
        paper.setCategory("NLP");
        paper.setConfidenceScore(0.94);
        paper.setStatus(PaperStatus.DONE);
        papers.saveAndFlush(paper);

        assertThat(exchange("/api/students", HttpMethod.GET, studentToken, null).getStatusCode())
            .isEqualTo(HttpStatus.FORBIDDEN);
        JsonNode hiddenDirectory = objectMapper.readTree(
            exchange("/api/students?q=student-" + suffix, HttpMethod.GET, facultyToken, null).getBody());
        assertThat(containsId(hiddenDirectory.get("content"), studentId)).isFalse();
        assertThat(exchange("/api/students/" + studentId, HttpMethod.GET, facultyToken, null).getStatusCode())
            .isEqualTo(HttpStatus.NOT_FOUND);

        String openingDescription = "This project investigates reliable machine learning for research workflows. ".repeat(2);
        ResponseEntity<String> opening = exchange("/api/openings", HttpMethod.POST, facultyToken, Map.of(
            "title", "Research matching",
            "description", openingDescription,
            "requiredSkills", "Python",
            "seats", 1
        ));
        long openingId = objectMapper.readTree(opening.getBody()).get("id").asLong();
        ResponseEntity<String> application = exchange("/api/applications", HttpMethod.POST, studentToken, Map.of(
            "openingId", openingId,
            "statementOfInterest", "I am interested in applying to this research project."
        ));
        assertThat(application.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> blogPost = exchange("/api/blogs", HttpMethod.POST, facultyToken, Map.of(
            "title", "Research notes",
            "content", "Published faculty research notes.",
            "status", "PUBLISHED",
            "tags", new String[] {"research"}
        ));
        assertThat(blogPost.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode facultyDetailWithContent = objectMapper.readTree(exchange(
            "/api/faculty/" + facultyId, HttpMethod.GET, studentToken, null
        ).getBody());
        assertThat(facultyDetailWithContent.get("openOpenings")).hasSize(1);
        assertThat(facultyDetailWithContent.get("publishedBlogPosts")).hasSize(1);

        JsonNode visibleStudents = objectMapper.readTree(exchange(
            "/api/students?q=student-" + suffix + "&skill=python", HttpMethod.GET, facultyToken, null
        ).getBody());
        assertThat(containsId(visibleStudents.get("content"), studentId)).isTrue();
        JsonNode studentDetail = objectMapper.readTree(exchange(
            "/api/students/" + studentId, HttpMethod.GET, facultyToken, null
        ).getBody());
        assertThat(studentDetail.get("papers").get(0).get("category").asText()).isEqualTo("NLP");
        assertThat(studentDetail.has("email")).isFalse();
        assertThat(studentDetail.has("phone")).isFalse();

        ResponseEntity<String> invalidUrl = exchange("/api/profile/me", HttpMethod.PUT, studentToken,
            Map.of("githubUrl", "javascript:alert(1)"));
        assertThat(invalidUrl.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(exchange("/api/faculty", HttpMethod.GET, null, null).getStatusCode())
            .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private String signup(String email, String role) throws Exception {
        Map<String, Object> request = new HashMap<>();
        String suffix = email.substring(email.indexOf('-') + 1, email.indexOf('@'));
        request.put("name", (role.equals("FACULTY") ? "faculty-" : "student-") + suffix);
        request.put("email", email);
        request.put("password", "test-password-123");
        request.put("role", role);
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

    private boolean containsId(JsonNode records, long id) {
        for (JsonNode record : records) {
            if (record.get("id").asLong() == id) return true;
        }
        return false;
    }
}
