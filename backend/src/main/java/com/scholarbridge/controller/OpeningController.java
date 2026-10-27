package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.ApplicantResponse;
import com.scholarbridge.dto.ApiDtos.OpeningCreateRequest;
import com.scholarbridge.dto.ApiDtos.OpeningResponse;
import com.scholarbridge.service.OpeningService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/openings")
public class OpeningController {
    private final OpeningService openingService;

    public OpeningController(OpeningService openingService) {
        this.openingService = openingService;
    }

    @GetMapping
    public List<OpeningResponse> getAll(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String skill
    ) {
        return openingService.getAll(search, skill);
    }

    @GetMapping("/{id}")
    public OpeningResponse getById(@PathVariable Long id) {
        return openingService.getById(id);
    }

    @PostMapping
    public OpeningResponse create(@Valid @RequestBody OpeningCreateRequest request) {
        return openingService.create(request);
    }

    @GetMapping("/{id}/applicants")
    public List<ApplicantResponse> applicants(@PathVariable Long id) {
        return openingService.getApplicants(id);
    }
}