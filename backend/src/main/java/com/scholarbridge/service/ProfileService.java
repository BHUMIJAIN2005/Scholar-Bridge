package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.ProfileUpdateRequest;
import com.scholarbridge.dto.ApiDtos.UserResponse;
import com.scholarbridge.entity.EducationEntry;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.entity.FacultyProjectEntry;
import com.scholarbridge.entity.StudentProfile;
import com.scholarbridge.entity.StudentProjectEntry;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.security.CurrentUserService;
import com.scholarbridge.repository.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
    private final CurrentUserService currentUser;
    private final UserRepository users;
    private final ApiMapper mapper;

    public ProfileService(CurrentUserService currentUser, UserRepository users, ApiMapper mapper) {
        this.currentUser = currentUser;
        this.users = users;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrent() {
        return mapper.user(currentUser.requireUser());
    }

    @Transactional
    public UserResponse updateCurrent(ProfileUpdateRequest request) {
        User user = currentUser.requireUser();
        if (request.name() != null) user.setName(request.name().trim());
        if (user.getRole() == UserRole.STUDENT) {
            StudentProfile profile = user.getStudentProfile();
            if (profile == null) {
                profile = new StudentProfile();
                profile.setUser(user);
                user.setStudentProfile(profile);
            }
            if (request.photoUrl() != null) {
                profile.setPhotoUrl(request.photoUrl());
                user.setPhotoUrl(request.photoUrl());
            }
            if (request.skills() != null) profile.setSkills(request.skills());
            if (request.skillTags() != null) profile.setSkillTags(List.copyOf(request.skillTags()));
            if (request.year() != null) profile.setYear(request.year());
            if (request.interests() != null) profile.setInterests(List.copyOf(request.interests()));
            if (request.studentProjects() != null) {
                profile.setProjects(request.studentProjects().stream().map(this::studentProject).toList());
            }
            if (request.githubUrl() != null) profile.setGithubUrl(request.githubUrl());
            if (request.linkedinUrl() != null) profile.setLinkedinUrl(request.linkedinUrl());
            if (request.visibility() != null) profile.setVisibility(request.visibility());
        }
        if (user.getRole() == UserRole.FACULTY) {
            FacultyProfile profile = user.getFacultyProfile();
            if (profile == null) {
                profile = new FacultyProfile();
                profile.setUser(user);
                profile.setApprovalStatus(user.getApprovalStatus() == null
                    ? FacultyApprovalStatus.APPROVED
                    : user.getApprovalStatus());
                user.setFacultyProfile(profile);
            }
            if (request.photoUrl() != null) {
                profile.setPhotoUrl(request.photoUrl());
                user.setPhotoUrl(request.photoUrl());
            }
            if (request.department() != null) profile.setDepartment(request.department());
            if (request.researchDomains() != null) profile.setResearchDomains(request.researchDomains());
            if (request.designation() != null) profile.setDesignation(request.designation());
            if (request.qualifications() != null) profile.setQualifications(request.qualifications());
            if (request.bio() != null) profile.setBio(request.bio());
            if (request.researchInterests() != null) {
                profile.setResearchInterests(List.copyOf(request.researchInterests()));
            }
            if (request.officeRoom() != null) profile.setOfficeRoom(request.officeRoom());
            if (request.officeHours() != null) profile.setOfficeHours(request.officeHours());
            if (request.scholarUrl() != null) profile.setScholarUrl(request.scholarUrl());
            if (request.orcidUrl() != null) profile.setOrcidUrl(request.orcidUrl());
            if (request.researchGateUrl() != null) profile.setResearchGateUrl(request.researchGateUrl());
            if (request.linkedinUrl() != null) profile.setLinkedinUrl(request.linkedinUrl());
            if (request.websiteUrl() != null) profile.setWebsiteUrl(request.websiteUrl());
            if (request.citationsCount() != null) profile.setCitationsCount(request.citationsCount());
            if (request.hIndex() != null) profile.setHIndex(request.hIndex());
            if (request.i10Index() != null) profile.setI10Index(request.i10Index());
            if (request.statsAsOf() != null) profile.setStatsAsOf(request.statsAsOf());
            if (request.acceptingStudents() != null) profile.setAcceptingStudents(request.acceptingStudents());
            if (request.education() != null) {
                profile.setEducation(request.education().stream().map(this::education).toList());
            }
            if (request.awards() != null) profile.setAwards(List.copyOf(request.awards()));
            if (request.facultyProjects() != null) {
                profile.setProjects(request.facultyProjects().stream().map(this::facultyProject).toList());
            }
        }
        return mapper.user(users.save(user));
    }

    private EducationEntry education(com.scholarbridge.dto.ApiDtos.EducationItem item) {
        EducationEntry entry = new EducationEntry();
        entry.setDegree(item.degree());
        entry.setInstitution(item.institution());
        entry.setYear(item.year());
        return entry;
    }

    private FacultyProjectEntry facultyProject(com.scholarbridge.dto.ApiDtos.FacultyProjectItem item) {
        FacultyProjectEntry project = new FacultyProjectEntry();
        project.setTitle(item.title());
        project.setFundingAgency(item.fundingAgency());
        project.setYears(item.years());
        project.setRole(item.role());
        return project;
    }

    private StudentProjectEntry studentProject(com.scholarbridge.dto.ApiDtos.StudentProjectItem item) {
        StudentProjectEntry project = new StudentProjectEntry();
        project.setTitle(item.title());
        project.setDescription(item.description());
        return project;
    }
}