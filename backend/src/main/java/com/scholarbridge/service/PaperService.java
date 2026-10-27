package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.CategorizeRequest;
import com.scholarbridge.dto.ApiDtos.CategorizeResponse;
import com.scholarbridge.dto.ApiDtos.PaperResponse;
import com.scholarbridge.entity.PaperStatus;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.exception.ResourceNotFoundException;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.security.CurrentUserService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PaperService {
    private final PaperSubmissionRepository papers;
    private final CurrentUserService currentUser;
    private final ApiMapper mapper;
    private final RestClient mlClient;
    private final Path uploadDirectory;

    public PaperService(
        PaperSubmissionRepository papers,
        CurrentUserService currentUser,
        ApiMapper mapper,
        RestClient mlClient,
        @Value("${app.uploads.directory}") String uploadDirectory
    ) {
        this.papers = papers;
        this.currentUser = currentUser;
        this.mapper = mapper;
        this.mlClient = mlClient;
        this.uploadDirectory = Paths.get(uploadDirectory).toAbsolutePath().normalize();
    }

    @Transactional
    public PaperResponse upload(String title, MultipartFile file) {
        User student = currentUser.requireRole(UserRole.STUDENT);
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Choose a non-empty PDF file.");
        }
        String originalName = file.getOriginalFilename() == null ? "paper.pdf" : file.getOriginalFilename();
        if (!originalName.toLowerCase().endsWith(".pdf") || file.getSize() > 20L * 1024 * 1024) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Upload a PDF file no larger than 20 MB.");
        }

        String storedFilename = UUID.randomUUID() + ".pdf";
        Path destination = uploadDirectory.resolve(storedFilename).normalize();
        try {
            Files.createDirectories(uploadDirectory);
            byte[] bytes = file.getBytes();
            if (bytes.length < 5 || !new String(bytes, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) {
                throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "The uploaded file is not a valid PDF.");
            }
            Files.write(destination, bytes);
            PaperSubmission paper = new PaperSubmission();
            paper.setStudent(student);
            paper.setTitle(title == null || title.isBlank() ? stripPdfExtension(originalName) : title.trim());
            paper.setStoredFilename(storedFilename);
            paper.setStatus(PaperStatus.PROCESSING);
            PaperSubmission saved = papers.saveAndFlush(paper);
            categorize(saved, bytes);
            return mapper.paper(saved);
        } catch (BusinessRuleException exception) {
            removeFile(destination);
            throw exception;
        } catch (IOException exception) {
            removeFile(destination);
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "The PDF could not be read.");
        }
    }

    @Transactional(readOnly = true)
    public List<PaperResponse> getMine() {
        User student = currentUser.requireRole(UserRole.STUDENT);
        return papers.findByStudentIdOrderByUploadedAtDesc(student.getId()).stream().map(mapper::paper).toList();
    }

    @Transactional(readOnly = true)
    public DownloadedPaper getFile(Long id) {
        User user = currentUser.requireUser();
        PaperSubmission paper = papers.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Paper was not found."));
        if (user.getRole() == UserRole.STUDENT && !paper.getStudent().getId().equals(user.getId())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "You cannot access this file.");
        }
        Path path = uploadDirectory.resolve(paper.getStoredFilename()).normalize();
        if (!path.startsWith(uploadDirectory) || !Files.isRegularFile(path)) {
            throw new ResourceNotFoundException("The paper file is no longer available.");
        }
        return new DownloadedPaper(new FileSystemResource(path), paper.getTitle() + ".pdf");
    }

    private void categorize(PaperSubmission paper, byte[] bytes) {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            String text = new PDFTextStripper().getText(document).trim();
            if (text.isBlank()) {
                paper.setStatus(PaperStatus.FAILED);
                papers.save(paper);
                return;
            }
            CategorizeResponse result = mlClient.post()
                .uri("/categorize")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new CategorizeRequest(text.substring(0, Math.min(text.length(), 1_000_000))))
                .retrieve()
                .body(CategorizeResponse.class);
            if (result == null || result.category() == null || result.confidence() == null) {
                paper.setStatus(PaperStatus.FAILED);
            } else {
                paper.setCategory(result.category());
                paper.setConfidenceScore(Math.max(0, Math.min(1, result.confidence())));
                paper.setStatus(PaperStatus.DONE);
            }
        } catch (Exception exception) {
            paper.setStatus(PaperStatus.FAILED);
        }
        papers.save(paper);
    }

    private void removeFile(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
    }

    private String stripPdfExtension(String name) {
        return name.replaceFirst("(?i)\\.pdf$", "");
    }

    public record DownloadedPaper(Resource resource, String filename) {
        public HttpHeaders headers() {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", filename);
            return headers;
        }
    }
}