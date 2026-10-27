package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.PaperResponse;
import com.scholarbridge.service.PaperService;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Validated
@RestController
@RequestMapping("/api/papers")
public class PaperController {
    private final PaperService paperService;

    public PaperController(PaperService paperService) {
        this.paperService = paperService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PaperResponse upload(
        @RequestParam @NotBlank String title,
        @RequestParam("file") MultipartFile file
    ) {
        return paperService.upload(title, file);
    }

    @GetMapping("/my")
    public List<PaperResponse> mine() {
        return paperService.getMine();
    }

}