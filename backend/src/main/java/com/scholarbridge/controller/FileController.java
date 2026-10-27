package com.scholarbridge.controller;

import com.scholarbridge.service.PaperService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private final PaperService paperService;

    public FileController(PaperService paperService) {
        this.paperService = paperService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        PaperService.DownloadedPaper paper = paperService.getFile(id);
        return ResponseEntity.ok().headers(paper.headers()).body(paper.resource());
    }
}