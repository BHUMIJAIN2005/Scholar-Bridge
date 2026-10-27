package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.ConferenceCreateRequest;
import com.scholarbridge.dto.ApiDtos.ConferenceResponse;
import com.scholarbridge.dto.ApiDtos.ConferenceSubmissionResponse;
import com.scholarbridge.dto.ApiDtos.ConferenceSubmitRequest;
import com.scholarbridge.dto.ApiDtos.SubmissionStatusRequest;
import com.scholarbridge.service.ConferenceService;
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
@RequestMapping("/api")
public class ConferenceController {
    private final ConferenceService conferenceService;

    public ConferenceController(ConferenceService conferenceService) {
        this.conferenceService = conferenceService;
    }

    @GetMapping("/conferences")
    public List<ConferenceResponse> getAll() {
        return conferenceService.getAll();
    }

    @PostMapping("/conferences")
    public ConferenceResponse create(@Valid @RequestBody ConferenceCreateRequest request) {
        return conferenceService.create(request);
    }

    @PostMapping("/conferences/{id}/submit")
    public ConferenceSubmissionResponse submit(
        @PathVariable Long id,
        @Valid @RequestBody ConferenceSubmitRequest request
    ) {
        return conferenceService.submit(id, request);
    }

    @GetMapping("/conferences/{id}/submissions")
    public List<ConferenceSubmissionResponse> getSubmissions(@PathVariable Long id) {
        return conferenceService.getSubmissions(id);
    }

    @GetMapping("/conferences/{id}/showcase")
    public List<ConferenceSubmissionResponse> showcase(@PathVariable Long id) {
        return conferenceService.showcase(id);
    }

    @PutMapping("/submissions/{id}/status")
    public ConferenceSubmissionResponse updateStatus(
        @PathVariable Long id,
        @Valid @RequestBody SubmissionStatusRequest request
    ) {
        return conferenceService.updateStatus(id, request.status(), request.reviewComments());
    }
}