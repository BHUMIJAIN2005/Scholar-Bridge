package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.ApplicantPaperResponse;
import com.scholarbridge.dto.ApiDtos.ApplicantResponse;
import com.scholarbridge.dto.ApiDtos.ApplicationResponse;
import com.scholarbridge.dto.ApiDtos.AuthResponse;
import com.scholarbridge.dto.ApiDtos.ConferenceResponse;
import com.scholarbridge.dto.ApiDtos.ConferenceSubmissionResponse;
import com.scholarbridge.dto.ApiDtos.EducationItem;
import com.scholarbridge.dto.ApiDtos.FacultyDetailResponse;
import com.scholarbridge.dto.ApiDtos.FacultyDirectoryResponse;
import com.scholarbridge.dto.ApiDtos.FacultyProjectItem;
import com.scholarbridge.dto.ApiDtos.OpeningResponse;
import com.scholarbridge.dto.ApiDtos.PaperResponse;
import com.scholarbridge.dto.ApiDtos.StudentDetailResponse;
import com.scholarbridge.dto.ApiDtos.StudentDirectoryResponse;
import com.scholarbridge.dto.ApiDtos.StudentPaperSummaryResponse;
import com.scholarbridge.dto.ApiDtos.StudentProjectItem;
import com.scholarbridge.dto.ApiDtos.UserResponse;
import com.scholarbridge.entity.Application;
import com.scholarbridge.entity.Conference;
import com.scholarbridge.entity.ConferenceSubmission;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.entity.EducationEntry;
import com.scholarbridge.entity.FacultyProjectEntry;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.SubmissionStatus;
import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.StudentProfile;
import com.scholarbridge.entity.StudentProjectEntry;
import com.scholarbridge.entity.StudentVisibility;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ApiMapper {
    public UserResponse user(User user) {
        FacultyProfile faculty = user.getFacultyProfile();
        StudentProfile student = user.getStudentProfile();
        List<String> researchInterests = faculty == null ? List.of() : nonEmpty(faculty.getResearchInterests())
            ? List.copyOf(faculty.getResearchInterests())
            : splitTags(faculty.getResearchDomains());
        List<String> studentSkills = student == null ? List.of() : nonEmpty(student.getSkillTags())
            ? List.copyOf(student.getSkillTags())
            : splitTags(student.getSkills());
        return new UserResponse(
            user.getId(), user.getName(), user.getEmail(), profilePhoto(user, faculty, student), user.getRole(),
            approvalStatus(user, faculty),
            faculty == null ? null : faculty.getDepartment(),
            faculty == null ? null : faculty.getResearchDomains(),
            student == null ? null : student.getSkills(),
            student == null ? null : student.getYear(),
            user.getCreatedAt(),
            profileCompleteness(user),
            studentSkills,
            student == null ? List.of() : List.copyOf(student.getInterests()),
            student == null ? List.of() : student.getProjects().stream().map(this::studentProject).toList(),
            student == null ? null : student.getGithubUrl(),
            student == null ? null : student.getLinkedinUrl(),
            student == null || student.getVisibility() == null ? StudentVisibility.ALL_FACULTY : student.getVisibility(),
            faculty == null ? null : faculty.getDesignation(),
            faculty == null ? null : faculty.getQualifications(),
            faculty == null ? null : faculty.getBio(),
            researchInterests,
            faculty == null ? null : faculty.getOfficeRoom(),
            faculty == null ? null : faculty.getOfficeHours(),
            faculty == null ? null : faculty.getScholarUrl(),
            faculty == null ? null : faculty.getOrcidUrl(),
            faculty == null ? null : faculty.getResearchGateUrl(),
            faculty == null ? null : faculty.getLinkedinUrl(),
            faculty == null ? null : faculty.getWebsiteUrl(),
            faculty == null ? null : faculty.getCitationsCount(),
            faculty == null ? null : faculty.getHIndex(),
            faculty == null ? null : faculty.getI10Index(),
            faculty == null ? null : faculty.getStatsAsOf(),
            faculty == null ? null : faculty.getAcceptingStudents(),
            faculty == null ? List.of() : faculty.getEducation().stream().map(this::education).toList(),
            faculty == null ? List.of() : List.copyOf(faculty.getAwards()),
            faculty == null ? List.of() : faculty.getProjects().stream().map(this::facultyProject).toList()
        );
    }

    public FacultyDirectoryResponse facultyDirectory(User user) {
        FacultyProfile profile = user.getFacultyProfile();
        return new FacultyDirectoryResponse(
            user.getId(), user.getName(), profilePhoto(user, profile, null),
            profile == null ? null : profile.getDepartment(),
            profile == null ? null : profile.getDesignation(),
            profile == null ? null : profile.getBio(),
            facultyResearchInterests(profile),
            profile == null ? null : profile.getCitationsCount(),
            profile == null ? null : profile.getHIndex(),
            profile == null ? null : profile.getI10Index(),
            profile == null ? null : profile.getAcceptingStudents(),
            profileCompleteness(user)
        );
    }

    public FacultyDetailResponse facultyDetail(
        User user,
        List<OpeningResponse> openOpenings,
        List<com.scholarbridge.dto.ApiDtos.BlogPostSummaryResponse> publishedBlogPosts
    ) {
        FacultyProfile profile = user.getFacultyProfile();
        return new FacultyDetailResponse(
            user.getId(), user.getName(), profilePhoto(user, profile, null),
            profile == null ? null : profile.getDepartment(),
            profile == null ? null : profile.getDesignation(),
            profile == null ? null : profile.getQualifications(),
            profile == null ? null : profile.getBio(),
            facultyResearchInterests(profile),
            profile == null ? null : profile.getOfficeRoom(),
            profile == null ? null : profile.getOfficeHours(),
            profile == null ? null : profile.getScholarUrl(),
            profile == null ? null : profile.getOrcidUrl(),
            profile == null ? null : profile.getResearchGateUrl(),
            profile == null ? null : profile.getLinkedinUrl(),
            profile == null ? null : profile.getWebsiteUrl(),
            profile == null ? null : profile.getCitationsCount(),
            profile == null ? null : profile.getHIndex(),
            profile == null ? null : profile.getI10Index(),
            profile == null ? null : profile.getStatsAsOf(),
            profile == null ? null : profile.getAcceptingStudents(),
            profile == null ? List.of() : profile.getEducation().stream().map(this::education).toList(),
            profile == null ? List.of() : List.copyOf(profile.getAwards()),
            profile == null ? List.of() : profile.getProjects().stream().map(this::facultyProject).toList(),
            profileCompleteness(user),
            openOpenings,
            publishedBlogPosts
        );
    }

    public StudentDirectoryResponse studentDirectory(User user) {
        StudentProfile profile = user.getStudentProfile();
        return new StudentDirectoryResponse(
            user.getId(), user.getName(), profilePhoto(user, null, profile),
            profile == null ? null : profile.getYear(),
            profile == null ? null : profile.getSkills(),
            studentSkills(profile),
            profile == null ? List.of() : List.copyOf(profile.getInterests()),
            profile == null ? List.of() : profile.getProjects().stream().map(this::studentProject).toList(),
            profile == null ? null : profile.getGithubUrl(),
            profile == null ? null : profile.getLinkedinUrl(),
            profileCompleteness(user)
        );
    }

    public StudentDetailResponse studentDetail(User user, List<PaperSubmission> papers) {
        StudentProfile profile = user.getStudentProfile();
        return new StudentDetailResponse(
            user.getId(), user.getName(), profilePhoto(user, null, profile),
            profile == null ? null : profile.getYear(),
            profile == null ? null : profile.getSkills(),
            studentSkills(profile),
            profile == null ? List.of() : List.copyOf(profile.getInterests()),
            profile == null ? List.of() : profile.getProjects().stream().map(this::studentProject).toList(),
            profile == null ? null : profile.getGithubUrl(),
            profile == null ? null : profile.getLinkedinUrl(),
            profileCompleteness(user),
            papers.stream().map(paper -> new StudentPaperSummaryResponse(
                paper.getId(), paper.getTitle(), paper.getCategory(), paper.getConfidenceScore()
            )).toList()
        );
    }

    public int profileCompleteness(User user) {
        if (user.getRole() == UserRole.STUDENT) {
            StudentProfile profile = user.getStudentProfile();
            return percentage(
                present(user.getName()), profile != null && present(profilePhoto(user, null, profile)),
                profile != null && present(profile.getYear()), profile != null && (!studentSkills(profile).isEmpty()),
                profile != null && !profile.getInterests().isEmpty(), profile != null && !profile.getProjects().isEmpty(),
                profile != null && present(profile.getGithubUrl()), profile != null && present(profile.getLinkedinUrl())
            );
        }
        FacultyProfile profile = user.getFacultyProfile();
        return percentage(
            present(user.getName()), profile != null && present(profilePhoto(user, profile, null)),
            profile != null && present(profile.getDesignation()), profile != null && present(profile.getDepartment()),
            profile != null && present(profile.getQualifications()), profile != null && present(profile.getBio()),
            profile != null && !facultyResearchInterests(profile).isEmpty(),
            profile != null && present(profile.getOfficeRoom()), profile != null && present(profile.getOfficeHours()),
            profile != null && !profile.getEducation().isEmpty()
        );
    }

    private FacultyApprovalStatus approvalStatus(User user, FacultyProfile profile) {
        if (user.getRole() != UserRole.FACULTY) {
            return null;
        }
        if (profile != null && profile.getApprovalStatus() != null) {
            return profile.getApprovalStatus();
        }
        return user.getApprovalStatus() == null ? FacultyApprovalStatus.APPROVED : user.getApprovalStatus();
    }

    private String profilePhoto(User user, FacultyProfile faculty, StudentProfile student) {
        if (faculty != null && present(faculty.getPhotoUrl())) return faculty.getPhotoUrl();
        if (student != null && present(student.getPhotoUrl())) return student.getPhotoUrl();
        return user.getPhotoUrl();
    }

    private List<String> facultyResearchInterests(FacultyProfile profile) {
        if (profile == null) return List.of();
        return nonEmpty(profile.getResearchInterests())
            ? List.copyOf(profile.getResearchInterests())
            : splitTags(profile.getResearchDomains());
    }

    private List<String> studentSkills(StudentProfile profile) {
        if (profile == null) return List.of();
        return nonEmpty(profile.getSkillTags()) ? List.copyOf(profile.getSkillTags()) : splitTags(profile.getSkills());
    }

    private List<String> splitTags(String value) {
        if (!present(value)) return List.of();
        return Arrays.stream(value.split(","))
            .map(String::trim)
            .filter(tag -> !tag.isBlank())
            .toList();
    }

    private boolean nonEmpty(List<?> values) {
        return values != null && !values.isEmpty();
    }

    private boolean present(String value) {
        return value != null && !value.isBlank();
    }

    private int percentage(boolean... populatedFields) {
        int filled = 0;
        for (boolean populated : populatedFields) {
            if (populated) filled++;
        }
        return (int) Math.round(filled * 100.0 / populatedFields.length);
    }

    private EducationItem education(EducationEntry entry) {
        return new EducationItem(entry.getDegree(), entry.getInstitution(), entry.getYear());
    }

    private FacultyProjectItem facultyProject(FacultyProjectEntry project) {
        return new FacultyProjectItem(
            project.getTitle(), project.getFundingAgency(), project.getYears(), project.getRole()
        );
    }

    private StudentProjectItem studentProject(StudentProjectEntry project) {
        return new StudentProjectItem(project.getTitle(), project.getDescription());
    }

    public AuthResponse auth(User user, String token, String message) {
        return new AuthResponse(token, user(user), message);
    }

    public OpeningResponse opening(ResearchOpening opening) {
        return new OpeningResponse(
            opening.getId(), opening.getFaculty().getId(), opening.getFaculty().getName(),
            opening.getFaculty().getFacultyProfile() == null ? null : opening.getFaculty().getFacultyProfile().getDepartment(),
            opening.getTitle(), opening.getDescription(), opening.getRequiredSkills(),
            opening.getSeats(), opening.getStatus(), opening.getCreatedAt()
        );
    }

    public ApplicationResponse application(Application application) {
        return new ApplicationResponse(
            application.getId(), application.getStudent().getId(), application.getOpening().getId(),
            application.getOpening().getTitle(), application.getOpening().getFaculty().getName(),
            application.getStatementOfInterest(), application.getStatus(), application.getAppliedAt()
        );
    }

    public ApplicantResponse applicant(Application application, List<PaperSubmission> papers) {
        User student = application.getStudent();
        return new ApplicantResponse(
            application.getId(), student.getId(), student.getName(), student.getEmail(),
            student.getStudentProfile() == null ? null : student.getStudentProfile().getSkills(),
            student.getStudentProfile() == null ? null : student.getStudentProfile().getYear(),
            application.getStatementOfInterest(), application.getStatus(), application.getAppliedAt(),
            papers.stream().map(this::applicantPaper).toList()
        );
    }

    public PaperResponse paper(PaperSubmission paper) {
        return new PaperResponse(
            paper.getId(), paper.getStudent().getId(), paper.getTitle(), paper.getAbstractText(),
            "/api/files/" + paper.getId(), paper.getCategory(), paper.getConfidenceScore(),
            paper.getStatus(), paper.getUploadedAt()
        );
    }

    public ConferenceResponse conference(Conference conference) {
        return new ConferenceResponse(
            conference.getId(), conference.getName(), conference.getDepartment(),
            conference.getSubmissionDeadline(), conference.getEventDate(), conference.getTracks()
        );
    }

    public ConferenceSubmissionResponse conferenceSubmission(ConferenceSubmission submission) {
        PaperSubmission paper = submission.getPaper();
        return new ConferenceSubmissionResponse(
            submission.getId(), paper.getId(), submission.getConference().getId(), submission.getTrack(),
            submission.getStatus(), submission.getReviewComments(), paper.getTitle(), paper.getStudent().getName(),
            paper.getAbstractText(), paper.getCategory(), paper.getConfidenceScore(), submission.getAcceptedAt(),
            submission.getStatus() == SubmissionStatus.ACCEPTED
                && Boolean.TRUE.equals(submission.getPublicPdfAllowed())
                ? "/api/public/conference-submissions/" + submission.getId() + "/paper"
                : null
        );
    }

    private ApplicantPaperResponse applicantPaper(PaperSubmission paper) {
        return new ApplicantPaperResponse(paper.getId(), paper.getTitle(), paper.getCategory(), paper.getConfidenceScore());
    }
}