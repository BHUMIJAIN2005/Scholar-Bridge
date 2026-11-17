package com.scholarbridge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.dto.ApiDtos.FacultyAiResearchProfileDto;
import com.scholarbridge.dto.ApiDtos.FacultyProfileConfirmRequest;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.CurrentUserService;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.response.DefaultResponseCreator;
import org.springframework.web.client.RestClient;

class FacultyResearchProfileAnalysisServiceTest {
    private static final String ANALYSIS_RESPONSE = """
        {
          "draft_id": "draft-123",
          "status": "success",
          "no_research_content": false,
          "research_profile": {
            "research_interests": ["Graph Learning"],
            "research_domains": ["Artificial Intelligence"],
            "technical_skills": ["Python"],
            "research_experience": ["Graph learning research project"],
            "methods": ["Graph Neural Networks"],
            "publications": [],
            "contributions": [],
            "embedding_text": "Research in graph learning."
          },
          "stated_requirements": null,
          "layman_summary": null,
          "extraction_metadata": [],
          "warnings": []
        }
        """;
    private static final String CONFIRMATION_RESPONSE = """
        {
          "professor_id": "17",
          "status": "confirmed",
          "is_confirmed": true,
          "confirmed_at": "2026-11-16T12:00:00Z",
          "message": "Profile confirmed.",
          "embedding_dimensions": 384,
          "research_profile": {
            "research_interests": ["Graph Learning"],
            "research_domains": ["Artificial Intelligence"],
            "technical_skills": ["Python"],
            "research_experience": ["Graph learning research project"],
            "methods": ["Graph Neural Networks"],
            "publications": [],
            "contributions": [],
            "embedding_text": "Research in graph learning."
          },
          "stated_requirements": null,
          "layman_summary": null,
          "embedding": [],
          "embedding_model": "all-MiniLM-L6-v2"
        }
        """;

    @Test
    void forwardsMultiplePdfDocumentsAndReturnsStructuredDraft() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/professor/analyze-documents"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().contentTypeCompatibleWith(MediaType.MULTIPART_FORM_DATA))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("name=\"files\"")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("filename=\"faculty-cv.pdf\"")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("filename=\"research-paper.pdf\"")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("name=\"document_types\"")))
            .andRespond(withSuccess(ANALYSIS_RESPONSE, MediaType.APPLICATION_JSON));

        FacultyResearchProfileService service = service(builder);
        var result = service.analyzeDocuments(
            List.of(
                pdf("faculty-cv.pdf", "%PDF-1.7\nsynthetic CV"),
                pdf("research-paper.pdf", "%PDF-1.7\nsynthetic paper")
            ),
            List.of("cv", "paper")
        );

        assertEquals("success", result.status());
        assertEquals(List.of("Python"), result.research_profile().technical_skills());
        assertEquals(List.of("Graph learning research project"), result.research_profile().research_experience());
        server.verify();
    }

    @Test
    void rejectsInvalidPdfBeforeCallingMlService() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        FacultyResearchProfileService service = service(builder);

        BusinessRuleException error = assertThrows(
            BusinessRuleException.class,
            () -> service.analyzeDocuments(
                List.of(new MockMultipartFile("files", "not-a-pdf.pdf", "application/pdf", "nope".getBytes(StandardCharsets.US_ASCII))),
                List.of("cv")
            )
        );

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        server.verify();
    }

    @Test
    void mapsMlServiceFailureToSanitizedGatewayError() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/professor/analyze-documents"))
            .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        FacultyResearchProfileService service = service(builder);

        BusinessRuleException error = assertThrows(
            BusinessRuleException.class,
            () -> service.analyzeDocuments(
                List.of(pdf("faculty-cv.pdf", "%PDF-1.7\nsynthetic CV")),
                List.of("cv")
            )
        );

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.getStatus());
        assertEquals("AI analysis is not configured. Contact the service administrator.", error.getMessage());
        server.verify();
    }

    @Test
    void persistsConfirmedProfileAfterMlReturnsAValidEmbeddingAndPreservesManualFields() throws Exception {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/professor/17/research-profile/confirm"))
            .andExpect(method(HttpMethod.PUT))
            .andExpect(jsonPath("$.embedding_model").value("all-MiniLM-L6-v2"))
            .andRespond(withSuccess(confirmationResponse(), MediaType.APPLICATION_JSON));

        CurrentUserService currentUser = org.mockito.Mockito.mock(CurrentUserService.class);
        User faculty = new User();
        faculty.setId(17L);
        faculty.setRole(UserRole.FACULTY);
        FacultyProfile manualProfile = new FacultyProfile();
        manualProfile.setUser(faculty);
        manualProfile.setResearchInterests(List.of("Manually curated interest"));
        manualProfile.setResearchDomains("Manually curated domain");
        faculty.setFacultyProfile(manualProfile);
        org.mockito.Mockito.when(currentUser.requireRole(UserRole.FACULTY)).thenReturn(faculty);
        UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
        org.mockito.Mockito.when(users.findByIdAndRole(17L, UserRole.FACULTY))
            .thenReturn(java.util.Optional.of(faculty));
        FacultyResearchProfileService service = new FacultyResearchProfileService(
            builder.build(), currentUser, users, new ObjectMapper(), null
        );
        FacultyAiResearchProfileDto draft = new FacultyAiResearchProfileDto(
            List.of("AI interest"),
            List.of("AI domain"),
            List.of("Python"),
            List.of("Research project"),
            List.of("Graph Neural Networks"),
            List.of(),
            List.of(),
            "Research in graph learning."
        );

        service.confirmProfile(new FacultyProfileConfirmRequest(draft, null, null, "draft-123"));

        assertEquals(true, manualProfile.getAiProfileConfirmed());
        assertEquals(List.of("Manually curated interest"), manualProfile.getResearchInterests());
        assertEquals("Manually curated domain", manualProfile.getResearchDomains());
        assertEquals("all-MiniLM-L6-v2", manualProfile.getAiResearchEmbeddingModel());
        assertEquals(384, new ObjectMapper().readTree(manualProfile.getAiResearchProfileEmbeddingJson()).size());
        org.mockito.Mockito.verify(users, org.mockito.Mockito.times(2)).saveAndFlush(faculty);
        server.verify();
    }

    @Test
    void persistsConfirmationWhenMlEmbeddingSynchronizationIsUnavailable() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/professor/17/research-profile/confirm"))
            .andExpect(method(HttpMethod.PUT))
            .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        CurrentUserService currentUser = org.mockito.Mockito.mock(CurrentUserService.class);
        User faculty = new User();
        faculty.setId(17L);
        faculty.setRole(UserRole.FACULTY);
        org.mockito.Mockito.when(currentUser.requireRole(UserRole.FACULTY)).thenReturn(faculty);
        UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
        org.mockito.Mockito.when(users.findByIdAndRole(17L, UserRole.FACULTY))
            .thenReturn(java.util.Optional.of(faculty));
        FacultyResearchProfileService service = new FacultyResearchProfileService(
            builder.build(), currentUser, users, new ObjectMapper(), null
        );
        FacultyAiResearchProfileDto draft = new FacultyAiResearchProfileDto(
            List.of("Graph Learning"),
            List.of("Artificial Intelligence"),
            List.of("Python"),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            "Research in graph learning."
        );

        var result = service.confirmProfile(new FacultyProfileConfirmRequest(draft, null, null, "draft-123"));

        assertEquals(true, result.is_confirmed());
        assertEquals("PENDING", result.embedding_sync_status());
        assertEquals(true, faculty.getFacultyProfile().getAiProfileConfirmed());
        assertEquals(null, faculty.getFacultyProfile().getAiResearchProfileEmbeddingJson());
        org.mockito.Mockito.verify(users).saveAndFlush(faculty);
        server.verify();
    }

    @Test
    void refusesToConfirmProfileWithoutResearchContent() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        FacultyResearchProfileService service = service(builder);

        BusinessRuleException error = assertThrows(
            BusinessRuleException.class,
            () -> service.confirmProfile(new FacultyProfileConfirmRequest(
                new FacultyAiResearchProfileDto(null, null, null, null, null, null, null, ""),
                null,
                null,
                "draft-123"
            ))
        );

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, error.getStatus());
        server.verify();
    }

    @Test
    void loadsConfirmedProfileFromTheDatabaseRatherThanTheAuthenticatedPrincipal() throws Exception {
        CurrentUserService currentUser = org.mockito.Mockito.mock(CurrentUserService.class);
        User authenticatedFaculty = new User();
        authenticatedFaculty.setId(17L);
        authenticatedFaculty.setRole(UserRole.FACULTY);
        org.mockito.Mockito.when(currentUser.requireRole(UserRole.FACULTY)).thenReturn(authenticatedFaculty);

        User persistedFaculty = new User();
        persistedFaculty.setId(17L);
        persistedFaculty.setRole(UserRole.FACULTY);
        FacultyProfile profile = new FacultyProfile();
        profile.setUser(persistedFaculty);
        profile.setAiProfileConfirmed(true);
        profile.setAiResearchProfileJson(new ObjectMapper().writeValueAsString(
            new FacultyAiResearchProfileDto(
                List.of("Graph Learning"),
                List.of("Artificial Intelligence"),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                "Research in graph learning."
            )
        ));
        persistedFaculty.setFacultyProfile(profile);

        UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
        org.mockito.Mockito.when(users.findByIdAndRole(17L, UserRole.FACULTY))
            .thenReturn(java.util.Optional.of(persistedFaculty));
        FacultyResearchProfileService service = new FacultyResearchProfileService(
            RestClient.builder().baseUrl("http://ml-service.test").build(),
            currentUser,
            users,
            new ObjectMapper(),
            null
        );

        var result = service.getConfirmedProfile();

        assertEquals(true, result.is_confirmed());
        assertEquals("PENDING", result.embedding_sync_status());
        assertEquals(List.of("Graph Learning"), result.research_profile().research_interests());
        org.mockito.Mockito.verify(users).findByIdAndRole(17L, UserRole.FACULTY);
    }

    @Test
    void upsertsAndReconcilesConfirmedProfilesFromDatabase() throws Exception {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/professor/17/research-profile/confirm"))
            .andExpect(method(HttpMethod.PUT))
            .andExpect(jsonPath("$.embedding.length()").value(384))
            .andExpect(jsonPath("$.embedding_model").value("all-MiniLM-L6-v2"))
            .andExpect(jsonPath("$.confirmed_at").isNotEmpty())
            .andRespond(withSuccess(confirmationResponse(), MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://ml-service.test/professor/confirmed-profiles/reconcile"))
            .andExpect(method(HttpMethod.PUT))
            .andExpect(jsonPath("$.professor_ids[0]").value("17"))
            .andRespond(withSuccess("{\"removed_ids\":[],\"remaining_count\":1}", MediaType.APPLICATION_JSON));

        User faculty = new User();
        faculty.setId(17L);
        faculty.setRole(UserRole.FACULTY);
        FacultyProfile profile = new FacultyProfile();
        profile.setUser(faculty);
        profile.setAiProfileConfirmed(true);
        profile.setAiProfileConfirmedAt(Instant.parse("2026-11-16T12:00:00Z"));
        List<Double> savedEmbedding = new ArrayList<>(Collections.nCopies(384, 0.0));
        savedEmbedding.set(0, 1.0);
        profile.setAiResearchProfileEmbeddingJson(new ObjectMapper().writeValueAsString(savedEmbedding));
        profile.setAiResearchEmbeddingModel("all-MiniLM-L6-v2");
        profile.setAiResearchProfileJson(new ObjectMapper().writeValueAsString(
            new FacultyAiResearchProfileDto(
                List.of("Graph Learning"),
                List.of("Artificial Intelligence"),
                List.of("Python"),
                List.of("Graph learning research project"),
                List.of("Graph Neural Networks"),
                List.of(),
                List.of(),
                "Research in graph learning."
            )
        ));
        faculty.setFacultyProfile(profile);

        UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
        org.mockito.Mockito.when(users.findApprovedFacultyWithConfirmedAiResearchProfile(
            UserRole.FACULTY,
            FacultyApprovalStatus.APPROVED
        )).thenReturn(List.of(faculty));
        org.mockito.Mockito.when(users.findByIdAndRole(17L, UserRole.FACULTY))
            .thenReturn(java.util.Optional.of(faculty));
        FacultyResearchProfileService service = new FacultyResearchProfileService(
            builder.build(),
            null,
            users,
            new ObjectMapper(),
            null
        );

        service.synchronizeConfirmedProfiles();

        org.mockito.Mockito.verify(users).findApprovedFacultyWithConfirmedAiResearchProfile(
            UserRole.FACULTY,
            FacultyApprovalStatus.APPROVED
        );
        server.verify();
    }

    private FacultyResearchProfileService service(RestClient.Builder builder) {
        CurrentUserService currentUser = org.mockito.Mockito.mock(CurrentUserService.class);
        User faculty = new User();
        faculty.setId(17L);
        faculty.setRole(UserRole.FACULTY);
        org.mockito.Mockito.when(currentUser.requireRole(UserRole.FACULTY)).thenReturn(faculty);
        UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
        org.mockito.Mockito.when(users.findByIdAndRole(17L, UserRole.FACULTY))
            .thenReturn(java.util.Optional.of(faculty));
        return new FacultyResearchProfileService(
            builder.build(),
            currentUser,
            users,
            new ObjectMapper(),
            null
        );
    }

    private String confirmationResponse() {
        return CONFIRMATION_RESPONSE.replace(
            "\"embedding\": []",
            "\"embedding\": [" + "1.0" + ",0.0".repeat(383) + "]"
        );
    }

    private MockMultipartFile pdf(String name, String content) {
        return new MockMultipartFile(
            "files",
            name,
            MediaType.APPLICATION_PDF_VALUE,
            content.getBytes(StandardCharsets.US_ASCII)
        );
    }

    private DefaultResponseCreator withStatus(HttpStatus status) {
        return org.springframework.test.web.client.response.MockRestResponseCreators.withStatus(status);
    }
}
