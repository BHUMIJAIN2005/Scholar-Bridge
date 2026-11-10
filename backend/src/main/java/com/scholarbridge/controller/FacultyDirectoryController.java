package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.FacultyDetailResponse;
import com.scholarbridge.dto.ApiDtos.FacultyDirectoryResponse;
import com.scholarbridge.service.DirectoryService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/faculty")
public class FacultyDirectoryController {
    private final DirectoryService directory;

    public FacultyDirectoryController(DirectoryService directory) {
        this.directory = directory;
    }

    @GetMapping
    public Page<FacultyDirectoryResponse> getFaculty(
        @RequestParam(required = false, name = "q") String query,
        @RequestParam(required = false) String researchArea,
        @RequestParam(required = false) Boolean acceptingStudents,
        @PageableDefault(size = 12) Pageable pageable
    ) {
        return directory.getFaculty(query, researchArea, acceptingStudents, pageable);
    }

    @GetMapping("/{id}")
    public FacultyDetailResponse getFaculty(@PathVariable Long id) {
        return directory.getFaculty(id);
    }
}
