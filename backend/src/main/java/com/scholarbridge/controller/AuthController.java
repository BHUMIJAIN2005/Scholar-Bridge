package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.AuthResponse;
import com.scholarbridge.dto.ApiDtos.GoogleLoginRequest;
import com.scholarbridge.dto.ApiDtos.LoginRequest;
import com.scholarbridge.dto.ApiDtos.SignupRequest;
import com.scholarbridge.service.AuthService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public AuthResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/google")
    public ResponseEntity<?> google(@Valid @RequestBody GoogleLoginRequest request) {
        var result = authService.googleLogin(request);
        if (result.needsRole()) {
            return ResponseEntity.ok(Map.of("needsRole", true));
        }
        return ResponseEntity.ok(result.response());
    }
}