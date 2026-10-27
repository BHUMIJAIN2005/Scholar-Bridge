package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.ApplicationResponse;
import com.scholarbridge.dto.ApiDtos.ApplyRequest;
import com.scholarbridge.entity.Application;
import com.scholarbridge.entity.ApplicationStatus;
import com.scholarbridge.entity.OpeningStatus;
import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.exception.ResourceNotFoundException;
import com.scholarbridge.repository.ApplicationRepository;
import com.scholarbridge.repository.ResearchOpeningRepository;
import com.scholarbridge.security.CurrentUserService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationService {
    private final ApplicationRepository applications;
    private final ResearchOpeningRepository openings;
    private final CurrentUserService currentUser;
    private final OpeningService openingService;
    private final ApiMapper mapper;

    public ApplicationService(
        ApplicationRepository applications,
        ResearchOpeningRepository openings,
        CurrentUserService currentUser,
        OpeningService openingService,
        ApiMapper mapper
    ) {
        this.applications = applications;
        this.openings = openings;
        this.currentUser = currentUser;
        this.openingService = openingService;
        this.mapper = mapper;
    }

    @Transactional
    public ApplicationResponse apply(ApplyRequest request) {
        User student = currentUser.requireRole(UserRole.STUDENT);
        ResearchOpening opening = openingService.findOpening(request.openingId());
        if (opening.getStatus() != OpeningStatus.OPEN) {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "This opening is no longer accepting applications.");
        }
        if (applications.existsByStudentIdAndOpeningId(student.getId(), opening.getId())) {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "You have already applied to this opening.");
        }
        Application application = new Application();
        application.setStudent(student);
        application.setOpening(opening);
        application.setStatementOfInterest(request.statementOfInterest().trim());
        return mapper.application(applications.save(application));
    }

    @Transactional(readOnly = true)
    public List<ApplicationResponse> getMine() {
        User student = currentUser.requireRole(UserRole.STUDENT);
        return applications.findByStudentIdOrderByAppliedAtDesc(student.getId()).stream()
            .map(mapper::application)
            .toList();
    }

    @Transactional
    public ApplicationResponse updateStatus(Long applicationId, ApplicationStatus status) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        if (status == ApplicationStatus.PENDING) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Application status must be ACCEPTED or REJECTED.");
        }
        Application application = applications.findById(applicationId)
            .orElseThrow(() -> new ResourceNotFoundException("Application was not found."));
        openingService.requireOwner(application.getOpening(), faculty);
        if (application.getStatus() != ApplicationStatus.PENDING) {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "This application has already been reviewed.");
        }
        application.setStatus(status);
        return mapper.application(applications.save(application));
    }
}