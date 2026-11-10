package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.PublicationRequest;
import com.scholarbridge.dto.ApiDtos.PublicationResponse;
import com.scholarbridge.service.PublicationService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/faculty/me/publications")
public class PublicationController {
    private final PublicationService publicationService;

    public PublicationController(PublicationService publicationService) {
        this.publicationService = publicationService;
    }

    @GetMapping
    public List<PublicationResponse> getMine() {
        return publicationService.getMine();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PublicationResponse create(@Valid @RequestBody PublicationRequest request) {
        return publicationService.create(request);
    }

    @PutMapping("/{id}")
    public PublicationResponse update(
        @PathVariable Long id,
        @Valid @RequestBody PublicationRequest request
    ) {
        return publicationService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        publicationService.delete(id);
    }
}
