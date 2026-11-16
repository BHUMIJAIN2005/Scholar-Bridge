package com.scholarbridge;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.service.ConferenceFormatValidationService;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class ConferenceFormatValidationServiceTest {
    private static final String VALIDATION_RESPONSE = """
        {
          "passed": false,
          "errors": ["Two-column layout could not be detected."],
          "warnings": ["Required section not detected: abstract."],
          "page_count": 1,
          "detected_fonts": ["Helvetica"],
          "detected_sections": ["references"],
          "filename": "paper-7.pdf",
          "validation_type": "preliminary_ieee_format_check"
        }
        """;

    @Test
    void forwardsStoredPdfAsMultipartAndParsesScreeningReport(@TempDir Path uploadDirectory) throws Exception {
        String filename = UUID.randomUUID() + ".pdf";
        byte[] pdf = "%PDF-1.7\nsynthetic paper".getBytes(StandardCharsets.US_ASCII);
        Files.write(uploadDirectory.resolve(filename), pdf);

        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/validate-format"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().contentTypeCompatibleWith(MediaType.MULTIPART_FORM_DATA))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("name=\"file\"")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("filename=\"paper-7.pdf\"")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("%PDF-1.7")))
            .andRespond(withSuccess(VALIDATION_RESPONSE, MediaType.APPLICATION_JSON));

        PaperSubmission paper = new PaperSubmission();
        paper.setId(7L);
        paper.setStoredFilename(filename);
        ConferenceFormatValidationService service =
            new ConferenceFormatValidationService(builder.build(), uploadDirectory.toString());

        var result = service.validate(paper);

        assertThat(result.passed()).isFalse();
        assertThat(result.pageCount()).isEqualTo(1);
        assertThat(result.detectedFonts()).containsExactly("Helvetica");
        assertThat(result.detectedSections()).containsExactly("references");
        assertThat(result.validationType()).isEqualTo("preliminary_ieee_format_check");
        server.verify();
    }

    @Test
    void refusesUnsafeStoredPathsBeforeCallingMl(@TempDir Path uploadDirectory) {
        PaperSubmission paper = new PaperSubmission();
        paper.setId(8L);
        paper.setStoredFilename("../outside.pdf");
        ConferenceFormatValidationService service =
            new ConferenceFormatValidationService(RestClient.builder().build(), uploadDirectory.toString());

        assertThatThrownBy(() -> service.validate(paper))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessage("The stored paper file is unavailable.");
    }

    @Test
    void doesNotReportSuccessfulValidationWhenMlServiceFails(@TempDir Path uploadDirectory) throws Exception {
        String filename = UUID.randomUUID() + ".pdf";
        Files.write(uploadDirectory.resolve(filename), "%PDF-1.7\npaper".getBytes(StandardCharsets.US_ASCII));
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/validate-format"))
            .andRespond(withServerError());

        PaperSubmission paper = new PaperSubmission();
        paper.setId(9L);
        paper.setStoredFilename(filename);
        ConferenceFormatValidationService service =
            new ConferenceFormatValidationService(builder.build(), uploadDirectory.toString());

        assertThatThrownBy(() -> service.validate(paper))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("submission was not saved");
        server.verify();
    }
}
