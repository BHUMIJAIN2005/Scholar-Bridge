package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.FacultyDetailResponse;
import com.scholarbridge.dto.ApiDtos.FacultyDirectoryResponse;
import com.scholarbridge.dto.ApiDtos.StudentDetailResponse;
import com.scholarbridge.dto.ApiDtos.StudentDirectoryResponse;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.OpeningStatus;
import com.scholarbridge.entity.StudentVisibility;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.ResourceNotFoundException;
import com.scholarbridge.repository.ApplicationRepository;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.repository.PublicationRepository;
import com.scholarbridge.repository.ResearchOpeningRepository;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.CurrentUserService;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DirectoryService {
    private static final int PAGE_SIZE = 12;

    private final CurrentUserService currentUser;
    private final UserRepository users;
    private final ApplicationRepository applications;
    private final PaperSubmissionRepository papers;
    private final PublicationRepository publications;
    private final ResearchOpeningRepository openings;
    private final BlogService blogs;
    private final ApiMapper mapper;

    public DirectoryService(
        CurrentUserService currentUser,
        UserRepository users,
        ApplicationRepository applications,
        PaperSubmissionRepository papers,
        PublicationRepository publications,
        ResearchOpeningRepository openings,
        BlogService blogs,
        ApiMapper mapper
    ) {
        this.currentUser = currentUser;
        this.users = users;
        this.applications = applications;
        this.papers = papers;
        this.publications = publications;
        this.openings = openings;
        this.blogs = blogs;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Page<FacultyDirectoryResponse> getFaculty(
        String query,
        String researchArea,
        Boolean acceptingStudents,
        Pageable pageable
    ) {
        currentUser.requireUser();
        return users.findFacultyDirectory(
            UserRole.FACULTY,
            FacultyApprovalStatus.APPROVED,
            normalize(query),
            normalize(researchArea),
            acceptingStudents,
            pageRequest(pageable)
        ).map(mapper::facultyDirectory);
    }

    @Transactional(readOnly = true)
    public FacultyDetailResponse getFaculty(Long id) {
        currentUser.requireUser();
        User faculty = users.findApprovedFacultyById(
            id, UserRole.FACULTY, FacultyApprovalStatus.APPROVED
        ).orElseThrow(() -> new ResourceNotFoundException("Faculty profile was not found."));
        return mapper.facultyDetail(
            faculty,
            openings.findByFacultyIdAndStatusOrderByCreatedAtDesc(faculty.getId(), OpeningStatus.OPEN)
                .stream().map(mapper::opening).toList(),
            blogs.getPublishedPostsForAuthor(faculty.getId()),
            publications.findByFacultyIdNewestFirst(faculty.getId()).stream().map(mapper::publication).toList()
        );
    }

    @Transactional(readOnly = true)
    public Page<StudentDirectoryResponse> getStudents(String query, String skill, Pageable pageable) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        return users.findVisibleStudentsForFaculty(
            UserRole.STUDENT,
            normalize(query),
            normalize(skill),
            faculty.getId(),
            StudentVisibility.ALL_FACULTY,
            pageRequest(pageable)
        ).map(mapper::studentDirectory);
    }

    @Transactional(readOnly = true)
    public StudentDetailResponse getStudent(Long id) {
        User faculty = currentUser.requireRole(UserRole.FACULTY);
        User student = users.findByIdAndRoleWithStudentProfile(id, UserRole.STUDENT)
            .orElseThrow(() -> new ResourceNotFoundException("Student profile was not found."));
        StudentVisibility visibility = student.getStudentProfile() == null
            || student.getStudentProfile().getVisibility() == null
            ? StudentVisibility.ALL_FACULTY
            : student.getStudentProfile().getVisibility();
        if (visibility == StudentVisibility.APPLIED_FACULTY_ONLY
            && !applications.existsByStudentAndFaculty(student.getId(), faculty.getId())) {
            throw new ResourceNotFoundException("Student profile was not found.");
        }
        return mapper.studentDetail(student, papers.findByStudentIdOrderByUploadedAtDesc(student.getId()));
    }

    private Pageable pageRequest(Pageable pageable) {
        return PageRequest.of(
            Math.max(0, pageable.getPageNumber()),
            PAGE_SIZE,
            Sort.by(Sort.Direction.ASC, "name").and(Sort.by(Sort.Direction.ASC, "id"))
        );
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toLowerCase(Locale.ROOT);
    }
}
