package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.FacultyAiAnalysisResponse;
import com.scholarbridge.dto.ApiDtos.FacultyAiProfileStatusResponse;
import com.scholarbridge.dto.ApiDtos.FacultyProfileConfirmRequest;
import com.scholarbridge.dto.ApiDtos.FacultyProfileConfirmResponse;
import com.scholarbridge.dto.ApiDtos.FacultyStudentMatchesResponse;
import com.scholarbridge.service.FacultyResearchProfileService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/faculty/research-profile")
public class FacultyResearchProfileController {
    private final FacultyResearchProfileService profileService;

    public FacultyResearchProfileController(FacultyResearchProfileService profileService) {
        this.profileService = profileService;
    }

    @PostMapping("/analyze")
    public FacultyAiAnalysisResponse analyzeDocuments(
        @RequestParam("files") List<MultipartFile> files,
        @RequestParam(value = "document_types", required = false) List<String> documentTypes
    ) {
        return profileService.analyzeDocuments(files, documentTypes);
    }

    @PutMapping("/confirm")
    public FacultyProfileConfirmResponse confirmProfile(@Valid @RequestBody FacultyProfileConfirmRequest request) {
        return profileService.confirmProfile(request);
    }

    @GetMapping
    public FacultyAiProfileStatusResponse getConfirmedProfile() {
        return profileService.getConfirmedProfile();
    }

    @GetMapping("/matches")
    public FacultyStudentMatchesResponse getStudentMatches(
        @RequestParam(value = "top_k", defaultValue = "20") int topK
    ) {
        return profileService.getStudentMatches(topK);
    }
}
