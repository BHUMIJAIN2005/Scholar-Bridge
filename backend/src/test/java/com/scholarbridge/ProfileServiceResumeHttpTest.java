package com.scholarbridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.CurrentUserService;
import com.scholarbridge.service.ApiMapper;
import com.scholarbridge.service.ProfileService;
import com.scholarbridge.service.StudentRecommendationsService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ProfileServiceResumeHttpTest {
    private static final String ML_RESPONSE = """
        {
          "status": "draft",
          "profile": {
            "name": "Synthetic Student",
            "email": "student@example.org",
            "phone": null,
            "academic_year": "3rd Year",
            "education": [{
              "degree": "BSc",
              "field_of_study": "Computer Science",
              "university": "Example University",
              "academic_year": "2024-2028",
              "cgpa": "3.8"
            }],
            "technical_skills": ["Python"],
            "skill_tags": ["Programming"],
            "projects": [],
            "internships": [],
            "work_experience": [],
            "certifications": [],
            "achievements": [],
            "research_interests": [],
            "research_experience": []
          },
          "extraction_metadata": {
            "filename": "synthetic-resume.pdf",
            "document_type": "cv",
            "extraction_method": "pdfplumber",
            "extracted_char_count": 350,
            "status": "success",
            "warnings": []
          },
          "warnings": []
        }
        """;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void postsPdfAsFilePartAndReadsFastApiSnakeCaseResponse() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/students/analyze-resume"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().contentTypeCompatibleWith(MediaType.MULTIPART_FORM_DATA))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("name=\"file\"")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("filename=\"synthetic-resume.pdf\"")))
            .andRespond(withSuccess(ML_RESPONSE, MediaType.APPLICATION_JSON));

        User student = new User();
        student.setRole(UserRole.STUDENT);
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(student, null)
        );

        ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
        ProfileService service = new ProfileService(
            new CurrentUserService(),
            org.mockito.Mockito.mock(UserRepository.class),
            new ApiMapper(objectMapper),
            objectMapper,
            builder.build(),
            org.mockito.Mockito.mock(StudentRecommendationsService.class),
            "target/test-profile-photos"
        );
        byte[] pdfBytes = "%PDF-1.7\nsynthetic".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        MockMultipartFile upload = new MockMultipartFile(
            "file", "synthetic-resume.pdf", MediaType.APPLICATION_PDF_VALUE, pdfBytes
        );

        var result = service.analyzeResume(upload);

        assertThat(result.status()).isEqualTo("draft");
        assertThat(result.profile().name()).isEqualTo("Synthetic Student");
        assertThat(result.profile().education().get(0).fieldOfStudy()).isEqualTo("Computer Science");
        assertThat(result.extractionMetadata().extractionMethod()).isEqualTo("pdfplumber");
        server.verify();
    }
}
