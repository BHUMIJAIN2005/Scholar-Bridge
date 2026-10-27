package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.ApplicationResponse;
import com.scholarbridge.dto.ApiDtos.ApplicationStatusRequest;
import com.scholarbridge.dto.ApiDtos.ApplyRequest;
import com.scholarbridge.service.ApplicationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {
    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    public ApplicationResponse apply(@Valid @RequestBody ApplyRequest request) {
        return applicationService.apply(request);
    }

    @GetMapping("/my")
    public List<ApplicationResponse> mine() {
        return applicationService.getMine();
    }

    @PutMapping("/{id}/status")
    public ApplicationResponse updateStatus(
        @PathVariable Long id,
        @Valid @RequestBody ApplicationStatusRequest request
    ) {
        return applicationService.updateStatus(id, request.status());
    }
}