package com.scholarbridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.dto.ApiDtos.StudentResumeAnalysisResponse;
import com.scholarbridge.dto.ApiDtos.StudentResumeDraft;
import com.scholarbridge.dto.ApiDtos.ResumeExtractionMetadata;
import com.scholarbridge.entity.User;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.service.StudentRecommendationsService;
import java.net.SocketTimeoutException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.ByteArrayResource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "app.seed.enabled=false"
)
class StudentResumeProfileIntegrationTest {
    private static final byte[] SAMPLE_PDF = "%PDF-1.7\nsynthetic resume".getBytes(java.nio.charset.StandardCharsets.US_ASCII);

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private RestClient mlClient;

    @MockitoBean
    private StudentRecommendationsService recommendations;

    @Test
    void resumeAnalysisRequiresAuthenticationAndStudentRole() throws Exception {
        ResponseEntity<String> unauthenticated = uploadResume(null);
        assertThat(unauthenticated.getStatusCode().value()).isEqualTo(401);

        String facultyToken = signup("FACULTY");
        ResponseEntity<String> facultyResponse = uploadResume(facultyToken);
        assertThat(facultyResponse.getStatusCode().value()).isEqualTo(403);

        String studentToken = signup("STUDENT");
        ResponseEntity<String> invalidFile = uploadResume(studentToken, "resume.txt", SAMPLE_PDF);
        assertThat(invalidFile.getStatusCode().value()).isEqualTo(415);
    }

    @Test
    void forwardsPdfToMlAndReturnsAnUnpersistedDraft() throws Exception {
        String studentToken = signup("STUDENT");
        RestClient.RequestBodyUriSpec post = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec request = mock(RestClient.RequestBodySpec.class);
        RestClient.ResponseSpec response = mock(RestClient.ResponseSpec.class);
        ArgumentCaptor<Object> requestBody = ArgumentCaptor.forClass(Object.class);
        when(mlClient.post()).thenReturn(post);
        when(post.uri("/students/analyze-resume")).thenReturn(request);
        when(request.contentType(MediaType.MULTIPART_FORM_DATA)).thenReturn(request);
        when(request.body(requestBody.capture())).thenReturn(request);
        when(request.retrieve()).thenReturn(response);
        when(response.body(StudentResumeAnalysisResponse.class)).thenReturn(sampleAnalysis());

        ResponseEntity<String> analysis = uploadResume(studentToken);

        assertThat(analysis.getStatusCode().value()).isEqualTo(200);
        JsonNode draft = objectMapper.readTree(analysis.getBody());
        assertThat(draft.get("status").asText()).isEqualTo("draft");
        assertThat(draft.get("profile").get("name").asText()).isEqualTo("Resume Student");
        verify(post).uri(eq("/students/analyze-resume"));
        assertThat(requestBody.getValue()).isInstanceOf(MultiValueMap.class);
        Object files = ((Map<?, ?>) requestBody.getValue()).get("file");
        Object uploadedFile = ((List<?>) files).get(0);
        assertThat(uploadedFile).isInstanceOf(ByteArrayResource.class);
        ByteArrayResource forwardedFile = (ByteArrayResource) uploadedFile;
        assertThat(forwardedFile.getFilename()).isEqualTo("resume.pdf");
        assertThat(forwardedFile.getByteArray()).isEqualTo(SAMPLE_PDF);

        ResponseEntity<String> savedProfile = exchange(
            "/api/profile/me", HttpMethod.GET, studentToken, null, MediaType.APPLICATION_JSON
        );
        JsonNode profile = objectMapper.readTree(savedProfile.getBody());
        assertThat(profile.get("studentResumeDetails").get("contactEmail").isNull()).isTrue();
    }

    @Test
    void mapsMlConnectTimeoutToGatewayError() throws Exception {
        String studentToken = signup("STUDENT");
        RestClient.RequestBodyUriSpec post = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec request = mock(RestClient.RequestBodySpec.class);
        when(mlClient.post()).thenReturn(post);
        when(post.uri("/students/analyze-resume")).thenReturn(request);
        when(request.contentType(MediaType.MULTIPART_FORM_DATA)).thenReturn(request);
        when(request.body(org.mockito.ArgumentMatchers.any(Object.class))).thenReturn(request);
        when(request.retrieve()).thenThrow(new ResourceAccessException(
            "I/O error on POST request for \"http://localhost:8000/students/analyze-resume\"",
            new SocketTimeoutException("Connect timed out")
        ));

        ResponseEntity<String> failedAnalysis = uploadResume(studentToken);

        assertThat(failedAnalysis.getStatusCode().value()).isEqualTo(502);
        assertThat(failedAnalysis.getBody()).contains("resume analysis service is unavailable");
    }

    @Test
    void confirmedResumeDetailsAndProjectTechnologiesSurviveProfileRoundTrip() throws Exception {
        String token = signup("STUDENT");
        Map<String, Object> details = Map.of(
            "contactEmail", "resume@example.org",
            "phone", "555-0101",
            "education", List.of(Map.of(
                "degree", "BSc",
                "fieldOfStudy", "Computer Science",
                "university", "Example University",
                "academicYear", "2024-2028",
                "cgpa", "3.8"
            )),
            "internships", List.of(Map.of(
                "role", "Research Intern",
                "organization", "Example Lab",
                "description", "Built a data analysis tool."
            )),
            "workExperience", List.of(),
            "certifications", List.of("Cloud Certificate"),
            "achievements", List.of("Research award"),
            "researchExperience", List.of()
        );
        Map<String, Object> update = Map.of(
            "name", "Confirmed Student",
            "year", "3rd Year",
            "skills", "Python",
            "studentProjects", List.of(Map.of(
                "title", "Resume Parser",
                "description", "Extracts structured resume data.",
                "technologies", List.of("Python", "FastAPI")
            )),
            "studentResumeDetails", details
        );

        ResponseEntity<String> saved = exchange(
            "/api/profile/me", HttpMethod.PUT, token, update, MediaType.APPLICATION_JSON
        );
        assertThat(saved.getStatusCode().value()).isEqualTo(200);

        ResponseEntity<String> fetched = exchange(
            "/api/profile/me", HttpMethod.GET, token, null, MediaType.APPLICATION_JSON
        );
        JsonNode profile = objectMapper.readTree(fetched.getBody());
        assertThat(profile.get("studentResumeDetails").get("education").get(0).get("cgpa").asText())
            .isEqualTo("3.8");
        assertThat(profile.get("studentResumeDetails").get("internships").get(0).get("organization").asText())
            .isEqualTo("Example Lab");
        assertThat(profile.get("studentProjects").get(0).get("technologies").toString())
            .contains("Python", "FastAPI");

        exchange(
            "/api/profile/me",
            HttpMethod.PUT,
            token,
            Map.of("skills", "Python, SQL"),
            MediaType.APPLICATION_JSON
        );
        JsonNode afterPartialUpdate = objectMapper.readTree(exchange(
            "/api/profile/me", HttpMethod.GET, token, null, MediaType.APPLICATION_JSON
        ).getBody());
        assertThat(afterPartialUpdate.get("studentResumeDetails").get("certifications").get(0).asText())
            .isEqualTo("Cloud Certificate");
    }

    @Test
    void profileSavePersistsAndReturnsWarningWhenRecommendationSyncFails() throws Exception {
        String token = signup("STUDENT");
        doThrow(new BusinessRuleException(HttpStatus.BAD_GATEWAY, "Recommendation service unavailable."))
            .when(recommendations).synchronizeStudentProfile(any(User.class));

        ResponseEntity<String> saved = exchange(
            "/api/profile/me",
            HttpMethod.PUT,
            token,
            Map.of("name", "Saved Despite Sync Failure", "skills", "Python"),
            MediaType.APPLICATION_JSON
        );

        assertThat(saved.getStatusCode().value()).isEqualTo(200);
        JsonNode response = objectMapper.readTree(saved.getBody());
        assertThat(response.get("name").asText()).isEqualTo("Saved Despite Sync Failure");
        assertThat(response.get("recommendationSyncWarning").asText())
            .isEqualTo("Recommendation service unavailable.");

        JsonNode fetched = objectMapper.readTree(exchange(
            "/api/profile/me", HttpMethod.GET, token, null, MediaType.APPLICATION_JSON
        ).getBody());
        assertThat(fetched.get("name").asText()).isEqualTo("Saved Despite Sync Failure");
        assertThat(fetched.get("skills").asText()).isEqualTo("Python");
    }

    private StudentResumeAnalysisResponse sampleAnalysis() {
        StudentResumeDraft profile = new StudentResumeDraft(
            "Resume Student",
            "resume@example.org",
            "555-0101",
            "3rd Year",
            List.of(),
            List.of("Python"),
            List.of("Programming"),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of()
        );
        ResumeExtractionMetadata metadata = new ResumeExtractionMetadata(
            "resume.pdf", "resume", "pymupdf", 120, "complete", List.of()
        );
        return new StudentResumeAnalysisResponse("draft", profile, metadata, List.of());
    }

    private String signup(String role) throws Exception {
        String email = role.toLowerCase() + "-" + UUID.randomUUID() + "@example.org";
        ResponseEntity<String> response = exchange(
            "/api/auth/signup",
            HttpMethod.POST,
            null,
            Map.of("name", role.equals("STUDENT") ? "Resume Student" : "Faculty",
                "email", email, "password", "test-password-123", "role", role),
            MediaType.APPLICATION_JSON
        );
        assertThat(response.getStatusCode().value()).isEqualTo(200);
        return objectMapper.readTree(response.getBody()).get("token").asText();
    }

    private ResponseEntity<String> uploadResume(String token) {
        return uploadResume(token, "resume.pdf", SAMPLE_PDF);
    }

    private ResponseEntity<String> uploadResume(String token, String filename, byte[] bytes) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        });
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return rest.exchange(
            "http://localhost:" + port + "/api/profile/analyze-resume",
            HttpMethod.POST,
            new HttpEntity<>(body, headers),
            String.class
        );
    }

    private ResponseEntity<String> exchange(
        String path,
        HttpMethod method,
        String token,
        Object body,
        MediaType contentType
    ) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(contentType);
        if (token != null) {
            headers.setBearerAuth(token);
        }
        return rest.exchange(
            "http://localhost:" + port + path,
            method,
            new HttpEntity<>(body, headers),
            String.class
        );
    }
}
