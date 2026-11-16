package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.RecommendedProfessorResponse;
import com.scholarbridge.dto.ApiDtos.RecommendedOpeningResponse;
import com.scholarbridge.service.StudentRecommendationsService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students/me")
public class StudentRecommendationsController {
    private final StudentRecommendationsService recommendations;

    public StudentRecommendationsController(StudentRecommendationsService recommendations) {
        this.recommendations = recommendations;
    }

    @GetMapping("/recommended")
    public List<RecommendedProfessorResponse> getRecommendedProfessors() {
        return recommendations.getRecommendedProfessors();
    }

    @GetMapping("/recommended-opportunities")
    public List<RecommendedOpeningResponse> getRecommendedOpenings() {
        return recommendations.getRecommendedOpenings();
    }
}
