package com.scholarbridge.controller;

import com.scholarbridge.service.PaperService;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PublicPaperController {
    private final PaperService paperService;

    public PublicPaperController(PaperService paperService) {
        this.paperService = paperService;
    }

    @GetMapping("/api/public/conference-submissions/{submissionId}/paper")
    public ResponseEntity<Resource> download(@PathVariable Long submissionId) {
        PaperService.DownloadedPaper paper = paperService.getPublicConferencePaper(submissionId);
        return ResponseEntity.ok().headers(paper.headers()).body(paper.resource());
    }
}
