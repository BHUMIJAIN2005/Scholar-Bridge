package com.scholarbridge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarbridge.dto.ApiDtos.OpeningCreateRequest;
import com.scholarbridge.dto.ApiDtos.OpeningUpdateRequest;
import com.scholarbridge.entity.OpeningStatus;
import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.ApplicationRepository;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.ResearchOpeningRepository;
import com.scholarbridge.security.CurrentUserService;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

class OpeningServiceTest {
    @Mock private ResearchOpeningRepository openings;
    @Mock private ApplicationRepository applications;
    @Mock private PaperSubmissionRepository papers;
    @Mock private CurrentUserService currentUser;
    @Mock private StudentRecommendationsService recommendations;

    private OpeningService service;
    private User faculty;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        faculty = new User();
        faculty.setId(12L);
        faculty.setName("Faculty Member");
        faculty.setRole(UserRole.FACULTY);
        when(currentUser.requireRole(UserRole.FACULTY)).thenReturn(faculty);
        when(openings.save(any(ResearchOpening.class))).thenAnswer(invocation -> {
            ResearchOpening opening = invocation.getArgument(0);
            if (opening.getId() == null) {
                opening.setId(42L);
            }
            return opening;
        });
        service = new OpeningService(
            openings,
            applications,
            papers,
            currentUser,
            new ApiMapper(new ObjectMapper()),
            new ObjectMapper(),
            recommendations
        );
    }

    @Test
    void savesStructuredCriteriaAndSynchronizesOpening() {
        OpeningCreateRequest request = new OpeningCreateRequest(
            "Graph Research Assistant",
            "Explore graph learning methods.",
            "Python, PyTorch",
            2,
            List.of("Python"),
            List.of("3rd Year"),
            List.of("Prior research or project experience preferred"),
            LocalDate.of(2026, 12, 1)
        );

        var response = service.create(request);

        ArgumentCaptor<ResearchOpening> openingCaptor = ArgumentCaptor.forClass(ResearchOpening.class);
        verify(recommendations).synchronizeOpening(openingCaptor.capture());
        ResearchOpening saved = openingCaptor.getValue();
        assertEquals(List.of("Python"), response.preferredSkills());
        assertEquals(List.of("3rd Year"), response.preferredYears());
        assertEquals(List.of("Prior research or project experience preferred"), response.eligibilityCriteria());
        assertEquals(LocalDate.of(2026, 12, 1), response.deadline());
        assertFalse(response.recommendationSyncPending());
        assertEquals(42L, saved.getId());
    }

    @Test
    void updatesAndSynchronizesOnlyTheOwningFacultyOpening() {
        ResearchOpening opening = existingOpening();
        when(openings.findById(42L)).thenReturn(Optional.of(opening));
        OpeningUpdateRequest request = new OpeningUpdateRequest(
            "Updated title",
            "Updated description",
            "Python",
            1,
            List.of("Python"),
            List.of("4th Year"),
            List.of("Statement of interest required"),
            null,
            OpeningStatus.CLOSED
        );

        var response = service.update(42L, request);

        assertEquals("Updated title", response.title());
        assertEquals(OpeningStatus.CLOSED, response.status());
        assertEquals(List.of("4th Year"), response.preferredYears());
        verify(recommendations).synchronizeOpening(opening);
    }

    @Test
    void rejectsUpdateByAnotherFacultyMemberWithoutSynchronizing() {
        ResearchOpening opening = existingOpening();
        when(openings.findById(42L)).thenReturn(Optional.of(opening));
        User otherFaculty = new User();
        otherFaculty.setId(13L);
        otherFaculty.setRole(UserRole.FACULTY);
        when(currentUser.requireRole(UserRole.FACULTY)).thenReturn(otherFaculty);

        assertThrows(
            BusinessRuleException.class,
            () -> service.update(42L, new OpeningUpdateRequest(
                "Updated title",
                "Updated description",
                "Python",
                1,
                List.of(),
                List.of(),
                List.of(),
                null,
                OpeningStatus.OPEN
            ))
        );
        verify(recommendations, never()).synchronizeOpening(any());
    }

    @Test
    void preservesOpeningWhenRecommendationSynchronizationIsUnavailable() {
        doThrow(new BusinessRuleException(
            org.springframework.http.HttpStatus.BAD_GATEWAY,
            "Recommendation service unavailable."
        )).when(recommendations).synchronizeOpening(any());

        var response = service.create(new OpeningCreateRequest(
            "Graph Research Assistant",
            "Explore graph learning methods.",
            "Python",
            1,
            List.of(),
            List.of(),
            List.of(),
            null
        ));

        assertEquals(42L, response.id());
        assertEquals(true, response.recommendationSyncPending());
        verify(openings, org.mockito.Mockito.times(2)).save(any(ResearchOpening.class));
    }

    private ResearchOpening existingOpening() {
        ResearchOpening opening = new ResearchOpening();
        opening.setId(42L);
        opening.setFaculty(faculty);
        opening.setTitle("Original title");
        opening.setDescription("Original description");
        opening.setRequiredSkills("Python");
        opening.setStatus(OpeningStatus.OPEN);
        return opening;
    }
}
