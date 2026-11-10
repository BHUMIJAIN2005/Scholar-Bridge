package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.StudentDetailResponse;
import com.scholarbridge.dto.ApiDtos.StudentDirectoryResponse;
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
@RequestMapping("/api/students")
public class StudentDirectoryController {
    private final DirectoryService directory;

    public StudentDirectoryController(DirectoryService directory) {
        this.directory = directory;
    }

    @GetMapping
    public Page<StudentDirectoryResponse> getStudents(
        @RequestParam(required = false, name = "q") String query,
        @RequestParam(required = false) String skill,
        @PageableDefault(size = 12) Pageable pageable
    ) {
        return directory.getStudents(query, skill, pageable);
    }

    @GetMapping("/{id}")
    public StudentDetailResponse getStudent(@PathVariable Long id) {
        return directory.getStudent(id);
    }
}
