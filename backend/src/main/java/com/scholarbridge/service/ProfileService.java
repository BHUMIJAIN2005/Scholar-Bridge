package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.ProfileUpdateRequest;
import com.scholarbridge.dto.ApiDtos.UserResponse;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.security.CurrentUserService;
import com.scholarbridge.repository.UserRepository;
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
        if (user.getRole() == UserRole.STUDENT && user.getStudentProfile() != null) {
            if (request.skills() != null) user.getStudentProfile().setSkills(request.skills());
            if (request.year() != null) user.getStudentProfile().setYear(request.year());
        }
        if (user.getRole() == UserRole.FACULTY && user.getFacultyProfile() != null) {
            if (request.department() != null) user.getFacultyProfile().setDepartment(request.department());
            if (request.researchDomains() != null) user.getFacultyProfile().setResearchDomains(request.researchDomains());
        }
        return mapper.user(users.save(user));
    }
}