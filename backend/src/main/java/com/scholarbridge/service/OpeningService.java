package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.ApplicantResponse;
import com.scholarbridge.dto.ApiDtos.OpeningCreateRequest;
import com.scholarbridge.dto.ApiDtos.OpeningResponse;
import com.scholarbridge.entity.Application;
import com.scholarbridge.entity.OpeningStatus;
import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.exception.ResourceNotFoundException;
import com.scholarbridge.repository.ApplicationRepository;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.ResearchOpeningRepository;
import com.scholarbridge.security.CurrentUserService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OpeningService {
    private final ResearchOpeningRepository openings;
    private final ApplicationRepository applications;
    private final PaperSubmissionRepository papers;
    private final CurrentUserService currentUser;
    private final ApiMapper mapper;

    public OpeningService(
        ResearchOpeningRepository openings,
        ApplicationRepository applications,
        PaperSubmissionRepository papers,
        CurrentUserService currentUser,
        ApiMapper mapper
    ) {
        this.openings = openings;
        this.applications = applications;
        this.papers = papers;
        this.currentUser = currentUser;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<OpeningResponse> getAll(String search, String skill) {
        User user = currentUser.requireUser();
        List<ResearchOpening> result = user.getRole() == UserRole.FACULTY
            ? openings.findByFacultyIdOrderByCreatedAtDesc(user.getId())
            : openings.findAllByOrderByCreatedAtDesc().stream()
                .filter(opening -> opening.getStatus() == OpeningStatus.OPEN)
                .toList();
        String query = search == null ? "" : search.trim().toLowerCase();
        String skillQuery = skill == null ? "" : skill.trim().toLowerCase();
        return result.stream()
            .filter(opening -> query.isBlank() || matches(opening, query))
            .filter(opening -> skillQuery.isBlank() || opening.getRequiredSkills().toLowerCase().contains(skillQuery))
            .map(mapper::opening)
            .toList();
    }

    @Transactional(readOnly = true)
    public OpeningResponse getById(Long id) {
        ResearchOpening opening = findOpening(id);
        return mapper.opening(opening);
    }

    @Transactional
    public OpeningResponse create(OpeningCreateRequest request) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        ResearchOpening opening = new ResearchOpening();
        opening.setFaculty(faculty);
        opening.setTitle(request.title().trim());
        opening.setDescription(request.description().trim());
        opening.setRequiredSkills(request.requiredSkills().trim());
        opening.setSeats(request.seats());
        return mapper.opening(openings.save(opening));
    }

    @Transactional(readOnly = true)
    public List<ApplicantResponse> getApplicants(Long openingId) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        ResearchOpening opening = findOpening(openingId);
        requireOwner(opening, faculty);
        return applications.findByOpeningIdOrderByAppliedAtDesc(openingId).stream()
            .map(application -> mapper.applicant(application,
                papers.findByStudentIdOrderByUploadedAtDesc(application.getStudent().getId())))
            .toList();
    }

    public ResearchOpening findOpening(Long id) {
        return openings.findById(id).orElseThrow(() -> new ResourceNotFoundException("Research opening was not found."));
    }

    public void requireOwner(ResearchOpening opening, User user) {
        if (!opening.getFaculty().getId().equals(user.getId())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "Only the faculty member who posted this opening can manage it.");
        }
    }

    private boolean matches(ResearchOpening opening, String query) {
        return opening.getTitle().toLowerCase().contains(query)
            || opening.getDescription().toLowerCase().contains(query)
            || opening.getRequiredSkills().toLowerCase().contains(query)
            || opening.getFaculty().getName().toLowerCase().contains(query)
            || (opening.getFaculty().getFacultyProfile() != null
                && opening.getFaculty().getFacultyProfile().getDepartment() != null
                && opening.getFaculty().getFacultyProfile().getDepartment().toLowerCase().contains(query));
    }
}