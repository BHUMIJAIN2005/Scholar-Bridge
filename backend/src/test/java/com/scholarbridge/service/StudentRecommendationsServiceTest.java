package com.scholarbridge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.StudentProfile;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.ResearchOpeningRepository;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.CurrentUserService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class StudentRecommendationsServiceTest {
    @Test
    void filtersProfessorMatchesAgainstConfirmedSpringProfiles() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/students/42/profile"))
            .andExpect(method(HttpMethod.PUT))
            .andRespond(withSuccess(
                "{\"student_id\":\"42\",\"embedding_dimensions\":384}",
                MediaType.APPLICATION_JSON
            ));
        server.expect(requestTo("http://ml-service.test/students/42/match-professors?top_k=5"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.eligible_professor_ids[0]").value("7"))
            .andRespond(withSuccess("""
                {
                  "student_id": "42",
                  "matches": [
                    {
                      "professor_id": "7",
                      "match_score": 88.0,
                      "research_interests": ["Graph Learning"],
                      "shared_research_interests": ["Graph Learning"],
                      "why_matched": "Research interests align.",
                      "professor_name": "Stale ML Name",
                      "department": "Stale ML Department",
                      "is_demo": false
                    },
                    {
                      "professor_id": "999",
                      "match_score": 99.0,
                      "research_interests": ["Unconfirmed"],
                      "shared_research_interests": [],
                      "why_matched": "Stale cache entry.",
                      "professor_name": "Stale Professor",
                      "department": "Stale Department",
                      "is_demo": false
                    }
                  ],
                  "count": 2,
                  "note": "Test response."
                }
                """, MediaType.APPLICATION_JSON));

        User student = new User();
        student.setId(42L);
        student.setName("Test Student");
        student.setRole(UserRole.STUDENT);
        StudentProfile studentProfile = new StudentProfile();
        studentProfile.setUser(student);
        student.setStudentProfile(studentProfile);

        User faculty = new User();
        faculty.setId(7L);
        faculty.setName("Confirmed Faculty");
        faculty.setRole(UserRole.FACULTY);
        FacultyProfile facultyProfile = new FacultyProfile();
        facultyProfile.setUser(faculty);
        facultyProfile.setDepartment("Verified Department");
        faculty.setFacultyProfile(facultyProfile);

        CurrentUserService currentUser = org.mockito.Mockito.mock(CurrentUserService.class);
        org.mockito.Mockito.when(currentUser.requireRole(UserRole.STUDENT)).thenReturn(student);
        UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
        org.mockito.Mockito.when(users.findByIdAndRoleWithStudentProfile(42L, UserRole.STUDENT))
            .thenReturn(Optional.of(student));
        org.mockito.Mockito.when(users.findApprovedFacultyWithConfirmedAiResearchProfile(
            UserRole.FACULTY, com.scholarbridge.entity.FacultyApprovalStatus.APPROVED
        )).thenReturn(List.of(faculty));
        org.mockito.Mockito.when(users.findApprovedFacultyById(
            7L, UserRole.FACULTY, com.scholarbridge.entity.FacultyApprovalStatus.APPROVED
        )).thenReturn(Optional.of(faculty));

        StudentRecommendationsService service = new StudentRecommendationsService(
            currentUser,
            org.mockito.Mockito.mock(PaperSubmissionRepository.class),
            builder.build(),
            users,
            new ApiMapper(new ObjectMapper()),
            org.mockito.Mockito.mock(ResearchOpeningRepository.class)
        );

        var matches = service.getRecommendedProfessors();

        assertEquals(1, matches.size());
        assertEquals("Confirmed Faculty", matches.getFirst().name());
        assertEquals("Verified Department", matches.getFirst().department());
        assertEquals(88.0, matches.getFirst().matchScore());
        server.verify();
    }

    @Test
    void synchronizesPaperAbstractAndRequestsFiveProfessorMatches() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://ml-service.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://ml-service.test/students/42/profile"))
            .andExpect(method(HttpMethod.PUT))
            .andExpect(jsonPath("$.papers[0].title").value("Vision Research"))
            .andExpect(jsonPath("$.papers[0].abstract").value("Detecting manipulated visual media."))
            .andExpect(jsonPath("$.papers[0].category").value("Computer Vision"))
            .andRespond(withSuccess(
                "{\"student_id\":\"42\",\"embedding_dimensions\":384}",
                MediaType.APPLICATION_JSON
            ));
        server.expect(requestTo("http://ml-service.test/students/42/match-professors?top_k=5"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.eligible_professor_ids").isArray())
            .andExpect(jsonPath("$.eligible_professor_ids").isEmpty())
            .andRespond(withSuccess(
                "{\"student_id\":\"42\",\"matches\":[],\"count\":0,\"note\":\"No profiles.\"}",
                MediaType.APPLICATION_JSON
            ));

        User student = new User();
        student.setId(42L);
        student.setName("Test Student");
        student.setRole(UserRole.STUDENT);
        StudentProfile profile = new StudentProfile();
        profile.setUser(student);
        profile.setYear("3rd Year");
        student.setStudentProfile(profile);

        PaperSubmission paper = new PaperSubmission();
        paper.setTitle("Vision Research");
        paper.setAbstractText("Detecting manipulated visual media.");
        paper.setCategory("Computer Vision");

        CurrentUserService currentUser = org.mockito.Mockito.mock(CurrentUserService.class);
        org.mockito.Mockito.when(currentUser.requireRole(UserRole.STUDENT)).thenReturn(student);
        UserRepository users = org.mockito.Mockito.mock(UserRepository.class);
        org.mockito.Mockito.when(users.findByIdAndRoleWithStudentProfile(42L, UserRole.STUDENT))
            .thenReturn(Optional.of(student));
        PaperSubmissionRepository papers = org.mockito.Mockito.mock(PaperSubmissionRepository.class);
        org.mockito.Mockito.when(papers.findByStudentIdOrderByUploadedAtDesc(42L)).thenReturn(List.of(paper));

        StudentRecommendationsService service = new StudentRecommendationsService(
            currentUser,
            papers,
            builder.build(),
            users,
            new ApiMapper(new ObjectMapper()),
            org.mockito.Mockito.mock(ResearchOpeningRepository.class)
        );

        assertTrue(service.getRecommendedProfessors().isEmpty());
        server.verify();
    }
}
