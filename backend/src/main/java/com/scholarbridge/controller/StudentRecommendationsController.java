package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.RecommendedProfessorResponse;
import com.scholarbridge.dto.ApiDtos.RecommendedOpeningResponse;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.security.CurrentUserService;
import com.scholarbridge.service.FacultyResearchProfileService;
import com.scholarbridge.service.StudentRecommendationsService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students/me")
public class StudentRecommendationsController {
    private final StudentRecommendationsService recommendations;
    private final FacultyResearchProfileService facultyProfiles;
    private final CurrentUserService currentUser;

    public StudentRecommendationsController(
        StudentRecommendationsService recommendations,
        FacultyResearchProfileService facultyProfiles,
        CurrentUserService currentUser
    ) {
        this.recommendations = recommendations;
        this.facultyProfiles = facultyProfiles;
        this.currentUser = currentUser;
    }

    @GetMapping("/recommended")
    public List<RecommendedProfessorResponse> getRecommendedProfessors() {
        currentUser.requireRole(UserRole.STUDENT);
        facultyProfiles.synchronizeConfirmedProfiles();
        return recommendations.getRecommendedProfessors();
    }

    @GetMapping("/recommended-opportunities")
    public List<RecommendedOpeningResponse> getRecommendedOpenings() {
        return recommendations.getRecommendedOpenings();
    }
}
