package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.PublicationRequest;
import com.scholarbridge.dto.ApiDtos.PublicationResponse;
import com.scholarbridge.entity.Publication;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.exception.ResourceNotFoundException;
import com.scholarbridge.repository.PublicationRepository;
import com.scholarbridge.security.CurrentUserService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicationService {
    private final PublicationRepository publications;
    private final CurrentUserService currentUser;
    private final ApiMapper mapper;

    public PublicationService(
        PublicationRepository publications,
        CurrentUserService currentUser,
        ApiMapper mapper
    ) {
        this.publications = publications;
        this.currentUser = currentUser;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<PublicationResponse> getMine() {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        return publications.findByFacultyIdNewestFirst(faculty.getId()).stream()
            .map(mapper::publication)
            .toList();
    }

    @Transactional
    public PublicationResponse create(PublicationRequest request) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        Publication publication = new Publication();
        publication.setFaculty(faculty);
        apply(publication, request);
        return mapper.publication(publications.save(publication));
    }

    @Transactional
    public PublicationResponse update(Long id, PublicationRequest request) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        Publication publication = findPublication(id);
        requireOwner(publication, faculty);
        apply(publication, request);
        return mapper.publication(publications.save(publication));
    }

    @Transactional
    public void delete(Long id) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        Publication publication = findPublication(id);
        requireOwner(publication, faculty);
        publications.delete(publication);
    }

    private Publication findPublication(Long id) {
        return publications.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Publication was not found."));
    }

    private void requireOwner(Publication publication, User faculty) {
        if (!publication.getFaculty().getId().equals(faculty.getId())) {
            throw new BusinessRuleException(
                HttpStatus.FORBIDDEN,
                "Only the faculty member who added this publication can manage it."
            );
        }
    }

    private void apply(Publication publication, PublicationRequest request) {
        publication.setTitle(request.title().trim());
        publication.setAuthors(request.authors().trim());
        publication.setVenue(trimToNull(request.venue()));
        publication.setYear(request.year());
        publication.setDoi(trimToNull(request.doi()));
        publication.setUrl(trimToNull(request.url()));
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
