package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.AuthResponse;
import com.scholarbridge.dto.ApiDtos.GoogleLoginOutcome;
import com.scholarbridge.dto.ApiDtos.GoogleLoginRequest;
import com.scholarbridge.dto.ApiDtos.LoginRequest;
import com.scholarbridge.dto.ApiDtos.SignupRequest;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.entity.StudentProfile;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
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
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final String googleClientId;
    private final Set<String> allowedDomains;
    private final Set<String> facultyAutoApproveDomains;
    private final boolean passwordLoginEnabled;

    public AuthService(
        UserRepository users,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtService jwtService,
        ApiMapper mapper,
        GoogleIdTokenVerifier googleIdTokenVerifier,
        @Value("${app.google.client-id:}") String googleClientId,
        @Value("${app.auth.allowed-domains:}") String allowedDomains,
        @Value("${app.auth.faculty-auto-approve-domains:}") String facultyAutoApproveDomains,
        @Value("${app.auth.password-login-enabled:true}") boolean passwordLoginEnabled
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.mapper = mapper;
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.googleClientId = googleClientId;
        this.allowedDomains = parseDomains(allowedDomains);
        this.facultyAutoApproveDomains = parseDomains(facultyAutoApproveDomains);
        this.passwordLoginEnabled = passwordLoginEnabled;
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
        if (!passwordLoginEnabled) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "Email and password sign-in is disabled.");
        }
        String email = request.email().trim().toLowerCase();
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        User user = users.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new BusinessRuleException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect."));
        return mapper.auth(user, jwtService.generateToken(user), "Signed in successfully.");
    }

    @Transactional
    public GoogleLoginOutcome googleLogin(GoogleLoginRequest request) {
        if (googleClientId.isBlank()) {
            throw new BusinessRuleException(HttpStatus.SERVICE_UNAVAILABLE, "Google sign-in is not configured.");
        }

        GoogleIdToken.Payload payload;
        try {
            GoogleIdToken verifiedToken = googleIdTokenVerifier.verify(request.idToken());
            if (verifiedToken == null || !Boolean.TRUE.equals(verifiedToken.getPayload().getEmailVerified())) {
                throw invalidGoogleToken();
            }
            payload = verifiedToken.getPayload();
        } catch (GeneralSecurityException | IOException exception) {
            throw invalidGoogleToken();
        }

        if (payload.getEmail() == null || payload.getEmail().isBlank()
            || payload.getSubject() == null || payload.getSubject().isBlank()) {
            throw invalidGoogleToken();
        }
        String email = payload.getEmail().trim().toLowerCase(Locale.ROOT);
        if (!isDomainAllowed(email, allowedDomains)) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "Please sign in with your institute email.");
        }

        String googleSubject = payload.getSubject();
        User user = users.findByGoogleSubject(googleSubject).orElse(null);
        User emailUser = users.findByEmailIgnoreCase(email).orElse(null);
        if (user != null && emailUser != null && !user.getId().equals(emailUser.getId())) {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "This Google account is linked to a different user.");
        }
        if (user == null) {
            user = emailUser;
        }

        if (user == null && request.role() == null) {
            return new GoogleLoginOutcome(true, null);
        }

        if (user == null) {
            user = createGoogleUser(payload, email, request.role());
        } else {
            if (user.getGoogleSubject() != null && !user.getGoogleSubject().equals(googleSubject)) {
                throw new BusinessRuleException(HttpStatus.CONFLICT, "This account is linked to a different Google account.");
            }
            user.setGoogleSubject(googleSubject);
            user.setPhotoUrl(payloadString(payload, "picture"));
            if (user.getRole() == UserRole.FACULTY && user.getApprovalStatus() == null) {
                user.setApprovalStatus(FacultyApprovalStatus.APPROVED);
            }
            user = users.save(user);
        }

        return new GoogleLoginOutcome(false, mapper.auth(user, jwtService.generateToken(user), "Signed in successfully."));
    }

    private User createGoogleUser(GoogleIdToken.Payload payload, String email, UserRole role) {
        if (role != UserRole.STUDENT && role != UserRole.FACULTY) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Choose Student or Faculty to create an account.");
        }
        User user = new User();
        String googleName = payloadString(payload, "name");
        user.setName(googleName == null || googleName.isBlank() ? email : googleName);
        user.setEmail(email);
        user.setRole(role);
        user.setGoogleSubject(payload.getSubject());
        user.setPhotoUrl(payloadString(payload, "picture"));

        if (role == UserRole.STUDENT) {
            StudentProfile profile = new StudentProfile();
            profile.setUser(user);
            user.setStudentProfile(profile);
        } else {
            user.setApprovalStatus(hasDomain(email, facultyAutoApproveDomains)
                ? FacultyApprovalStatus.APPROVED
                : FacultyApprovalStatus.PENDING);
            FacultyProfile profile = new FacultyProfile();
            profile.setUser(user);
            user.setFacultyProfile(profile);
        }
        return users.save(user);
    }

    private boolean isDomainAllowed(String email, Set<String> domains) {
        return domains.isEmpty() || hasDomain(email, domains);
    }

    private boolean hasDomain(String email, Set<String> domains) {
        int atIndex = email.lastIndexOf('@');
        if (atIndex < 0) {
            return false;
        }
        return domains.contains(email.substring(atIndex + 1).toLowerCase(Locale.ROOT));
    }

    private String payloadString(GoogleIdToken.Payload payload, String claim) {
        Object value = payload.get(claim);
        return value instanceof String string ? string : null;
    }

    private Set<String> parseDomains(String configuredDomains) {
        return Arrays.stream(configuredDomains.split(","))
            .map(domain -> domain.trim().toLowerCase(Locale.ROOT))
            .filter(domain -> !domain.isBlank())
            .collect(Collectors.toUnmodifiableSet());
    }

    private BusinessRuleException invalidGoogleToken() {
        return new BusinessRuleException(HttpStatus.UNAUTHORIZED, "Google sign-in failed. Please sign in again.");
    }
}