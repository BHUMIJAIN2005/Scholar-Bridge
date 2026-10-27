package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.AuthResponse;
import com.scholarbridge.dto.ApiDtos.LoginRequest;
import com.scholarbridge.dto.ApiDtos.SignupRequest;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.entity.StudentProfile;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final ApiMapper mapper;

    public AuthService(
        UserRepository users,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtService jwtService,
        ApiMapper mapper
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.mapper = mapper;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        if (request.role() == UserRole.STUDENT) {
            StudentProfile profile = new StudentProfile();
            profile.setUser(user);
            profile.setSkills(request.skills());
            profile.setYear(request.year());
            user.setStudentProfile(profile);
        } else {
            FacultyProfile profile = new FacultyProfile();
            profile.setUser(user);
            profile.setDepartment(request.department());
            profile.setResearchDomains(request.researchDomains());
            user.setFacultyProfile(profile);
        }
        User saved = users.save(user);
        return mapper.auth(saved, jwtService.generateToken(saved), "Account created successfully.");
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        User user = users.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new BusinessRuleException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect."));
        return mapper.auth(user, jwtService.generateToken(user), "Signed in successfully.");
    }
}