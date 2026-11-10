package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.ProfileUpdateRequest;
import com.scholarbridge.dto.ApiDtos.UserResponse;
import com.scholarbridge.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public UserResponse getCurrent() {
        return profileService.getCurrent();
    }

    @PutMapping("/me")
    public UserResponse updateCurrent(@Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.updateCurrent(request);
    }

    @PostMapping("/me/photo")
    public UserResponse uploadPhoto(@RequestParam("file") MultipartFile file) {
        return profileService.uploadPhoto(file);
    }

    @DeleteMapping("/me/photo")
    public UserResponse deletePhoto() {
        return profileService.deletePhoto();
    }
}
