package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.ApplicantPaperResponse;
import com.scholarbridge.dto.ApiDtos.ApplicantResponse;
import com.scholarbridge.dto.ApiDtos.ApplicationResponse;
import com.scholarbridge.dto.ApiDtos.AuthResponse;
import com.scholarbridge.dto.ApiDtos.ConferenceResponse;
import com.scholarbridge.dto.ApiDtos.ConferenceSubmissionResponse;
import com.scholarbridge.dto.ApiDtos.OpeningResponse;
import com.scholarbridge.dto.ApiDtos.PaperResponse;
import com.scholarbridge.dto.ApiDtos.UserResponse;
import com.scholarbridge.entity.Application;
import com.scholarbridge.entity.Conference;
import com.scholarbridge.entity.ConferenceSubmission;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.User;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ApiMapper {
    public UserResponse user(User user) {
        return new UserResponse(
            user.getId(), user.getName(), user.getEmail(), user.getRole(),
            user.getFacultyProfile() == null ? null : user.getFacultyProfile().getDepartment(),
            user.getFacultyProfile() == null ? null : user.getFacultyProfile().getResearchDomains(),
            user.getStudentProfile() == null ? null : user.getStudentProfile().getSkills(),
            user.getStudentProfile() == null ? null : user.getStudentProfile().getYear(),
            user.getCreatedAt()
        );
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
            paper.getId(), paper.getStudent().getId(), paper.getTitle(),
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
            paper.getCategory(), paper.getConfidenceScore(), submission.getAcceptedAt()
        );
    }

    private ApplicantPaperResponse applicantPaper(PaperSubmission paper) {
        return new ApplicantPaperResponse(paper.getId(), paper.getTitle(), paper.getCategory(), paper.getConfidenceScore());
    }
}