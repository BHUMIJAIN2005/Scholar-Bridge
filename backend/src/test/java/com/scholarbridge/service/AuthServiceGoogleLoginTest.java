package com.scholarbridge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.scholarbridge.dto.ApiDtos.AuthResponse;
import com.scholarbridge.dto.ApiDtos.GoogleLoginOutcome;
import com.scholarbridge.dto.ApiDtos.GoogleLoginRequest;
import com.scholarbridge.dto.ApiDtos.SignupRequest;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.repository.UserRepository;
import com.scholarbridge.security.JwtService;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

class AuthServiceGoogleLoginTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final ApiMapper mapper = mock(ApiMapper.class);
    private final GoogleIdTokenVerifier verifier = mock(GoogleIdTokenVerifier.class);
    private final GoogleIdToken token = mock(GoogleIdToken.class);
    private final GoogleIdToken.Payload payload = mock(GoogleIdToken.Payload.class);
    private AuthService service;

    @BeforeEach
    void setUp() throws Exception {
        when(verifier.verify("valid-token")).thenReturn(token);
        when(token.getPayload()).thenReturn(payload);
        when(payload.getEmailVerified()).thenReturn(true);
        when(payload.getEmail()).thenReturn("faculty@mitsgwl.ac.in");
        when(payload.getSubject()).thenReturn("google-subject");
        when(payload.get("name")).thenReturn("New Faculty");
        when(users.findByGoogleSubject("google-subject")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCase("faculty@mitsgwl.ac.in")).thenReturn(Optional.empty());
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("application-jwt");
        when(mapper.auth(any(User.class), anyString(), anyString()))
            .thenReturn(new AuthResponse("application-jwt", null, "Signed in successfully."));
        service = new AuthService(
            users, passwordEncoder, authenticationManager, jwtService, mapper, verifier,
            "google-client-id", "", "mitsgwl.ac.in", true, false
        );
    }

    @Test
    void createsNewFacultyAsPendingWithoutAutoApproval() {
        service = new AuthService(
            users, passwordEncoder, authenticationManager, jwtService, mapper, verifier,
            "google-client-id", "", "", true, false
        );

        GoogleLoginOutcome result = service.googleLogin(new GoogleLoginRequest("valid-token", UserRole.FACULTY));

        assertTrue(!result.needsRole());
        assertEquals("application-jwt", result.response().token());
        var savedUser = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(users).save(savedUser.capture());
        assertEquals(FacultyApprovalStatus.PENDING, savedUser.getValue().getApprovalStatus());
        assertEquals("google-subject", savedUser.getValue().getGoogleSubject());
        assertEquals("New Faculty", savedUser.getValue().getName());
    }

    @Test
    void autoApprovesFacultyWhenEmailMatchesConfiguredDomainExactly() {
        GoogleLoginOutcome result = service.googleLogin(new GoogleLoginRequest("valid-token", UserRole.FACULTY));

        assertTrue(!result.needsRole());
        var savedUser = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(users).save(savedUser.capture());
        assertEquals(FacultyApprovalStatus.APPROVED, savedUser.getValue().getApprovalStatus());
    }

    @Test
    void leavesNewUserUncreatedUntilRoleIsProvided() {
        GoogleLoginOutcome result = service.googleLogin(new GoogleLoginRequest("valid-token", null));

        assertTrue(result.needsRole());
        assertNull(result.response());
        verifyNoInteractions(jwtService, mapper);
    }

    @Test
    void rejectsEmailOutsideConfiguredDomainWithExactForbiddenMessage() {
        service = new AuthService(
            users, passwordEncoder, authenticationManager, jwtService, mapper, verifier,
            "google-client-id", "mitsgwl.ac.in", "", true, false
        );
        when(payload.getEmail()).thenReturn("faculty@notmitsgwl.ac.in");

        BusinessRuleException exception = assertThrows(
            BusinessRuleException.class,
            () -> service.googleLogin(new GoogleLoginRequest("valid-token", UserRole.FACULTY))
        );

        assertEquals(HttpStatus.FORBIDDEN, exception.getStatus());
        assertEquals("Please sign in with your institute email.", exception.getMessage());
        verifyNoInteractions(jwtService, mapper);
    }

    @Test
    void rejectsUnverifiedGoogleEmail() throws Exception {
        when(payload.getEmailVerified()).thenReturn(false);

        BusinessRuleException exception = assertThrows(
            BusinessRuleException.class,
            () -> service.googleLogin(new GoogleLoginRequest("valid-token", UserRole.STUDENT))
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        verifyNoInteractions(users, jwtService, mapper);
    }

    @Test
    void linksGoogleIdentityToExistingPasswordAccount() {
        User passwordUser = new User();
        passwordUser.setName("Existing Student");
        passwordUser.setEmail("faculty@mitsgwl.ac.in");
        passwordUser.setPasswordHash("existing-password-hash");
        passwordUser.setRole(UserRole.STUDENT);
        when(users.findByEmailIgnoreCase("faculty@mitsgwl.ac.in")).thenReturn(Optional.of(passwordUser));
        when(payload.get("picture")).thenReturn("https://example.test/profile.png");

        GoogleLoginOutcome result = service.googleLogin(new GoogleLoginRequest("valid-token", null));

        assertTrue(!result.needsRole());
        var savedUser = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(users).save(savedUser.capture());
        assertEquals("google-subject", savedUser.getValue().getGoogleSubject());
        assertEquals("https://example.test/profile.png", savedUser.getValue().getPhotoUrl());
        assertEquals("existing-password-hash", savedUser.getValue().getPasswordHash());
        assertEquals(UserRole.STUDENT, savedUser.getValue().getRole());
    }

    @Test
    void rejectsTokenThatGoogleDoesNotVerify() throws Exception {
        when(verifier.verify("invalid-token")).thenReturn(null);

        BusinessRuleException exception = assertThrows(
            BusinessRuleException.class,
            () -> service.googleLogin(new GoogleLoginRequest("invalid-token", UserRole.STUDENT))
        );

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        verifyNoInteractions(users, jwtService, mapper);
    }

    @Test
    void requiresApprovalForNewPasswordFacultyWhenConfigured() {
        AuthService approvalRequiredService = new AuthService(
            users, passwordEncoder, authenticationManager, jwtService, mapper, verifier,
            "google-client-id", "", "mitsgwl.ac.in", true, true
        );
        when(passwordEncoder.encode("password-123")).thenReturn("password-hash");

        approvalRequiredService.signup(new SignupRequest(
            "New Faculty", "new-faculty@example.edu", "password-123",
            UserRole.FACULTY, null, null, null, null
        ));

        var savedUser = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(users).save(savedUser.capture());
        assertEquals(FacultyApprovalStatus.PENDING, savedUser.getValue().getApprovalStatus());
        assertEquals(FacultyApprovalStatus.PENDING, savedUser.getValue().getFacultyProfile().getApprovalStatus());
    }
}
