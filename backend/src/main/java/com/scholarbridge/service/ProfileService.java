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
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.exception.ResourceNotFoundException;
import com.scholarbridge.security.CurrentUserService;
import com.scholarbridge.repository.UserRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProfileService {
    private static final long MAX_PHOTO_SIZE = 2L * 1024 * 1024; // 2 MB

    private final CurrentUserService currentUser;
    private final UserRepository users;
    private final ApiMapper mapper;
    private final Path profilePhotosDirectory;

    public ProfileService(
        CurrentUserService currentUser,
        UserRepository users,
        ApiMapper mapper,
        @Value("${app.uploads.profile-photos-dir:uploads/profile-photos}") String profilePhotosDir
    ) {
        this.currentUser = currentUser;
        this.users = users;
        this.mapper = mapper;
        this.profilePhotosDirectory = Paths.get(profilePhotosDir).toAbsolutePath().normalize();
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

    @Transactional
    public UserResponse uploadPhoto(MultipartFile file) {
        User user = currentUser.requireUser();
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Choose a non-empty image file.");
        }
        if (file.getSize() > MAX_PHOTO_SIZE) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Profile photo must be 2 MB or smaller.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Could not read the uploaded image.");
        }

        String imageType = detectImageType(bytes);
        if (imageType == null) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Profile photo must be a valid JPEG, PNG, or WebP image.");
        }

        String ext = switch (imageType) {
            case "jpeg" -> ".jpg";
            case "png" -> ".png";
            case "webp" -> ".webp";
            default -> "";
        };

        String storedFilename = UUID.randomUUID() + ext;
        try {
            Files.createDirectories(profilePhotosDirectory);
            Path destination = profilePhotosDirectory.resolve(storedFilename).normalize();
            Files.write(destination, bytes);
        } catch (IOException e) {
            throw new BusinessRuleException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not save the profile photo.");
        }

        deleteStoredPhotoFile(getExistingPhotoUrl(user));

        String photoUrl = "/api/files/profile-photos/" + storedFilename;
        if (user.getRole() == UserRole.STUDENT) {
            StudentProfile profile = user.getStudentProfile();
            if (profile == null) {
                profile = new StudentProfile();
                profile.setUser(user);
                user.setStudentProfile(profile);
            }
            profile.setPhotoUrl(photoUrl);
            user.setPhotoUrl(photoUrl);
        } else if (user.getRole() == UserRole.FACULTY) {
            FacultyProfile profile = user.getFacultyProfile();
            if (profile == null) {
                profile = new FacultyProfile();
                profile.setUser(user);
                profile.setApprovalStatus(user.getApprovalStatus() == null
                    ? FacultyApprovalStatus.APPROVED
                    : user.getApprovalStatus());
                user.setFacultyProfile(profile);
            }
            profile.setPhotoUrl(photoUrl);
            user.setPhotoUrl(photoUrl);
        } else {
            user.setPhotoUrl(photoUrl);
        }

        return mapper.user(users.save(user));
    }

    @Transactional
    public UserResponse deletePhoto() {
        User user = currentUser.requireUser();
        deleteStoredPhotoFile(getExistingPhotoUrl(user));

        if (user.getRole() == UserRole.STUDENT) {
            if (user.getStudentProfile() != null) {
                user.getStudentProfile().setPhotoUrl(null);
            }
            user.setPhotoUrl(null);
        } else if (user.getRole() == UserRole.FACULTY) {
            if (user.getFacultyProfile() != null) {
                user.getFacultyProfile().setPhotoUrl(null);
            }
            user.setPhotoUrl(null);
        } else {
            user.setPhotoUrl(null);
        }

        return mapper.user(users.save(user));
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> getProfilePhoto(String filename) {
        if (filename == null || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Invalid file name.");
        }

        Path filePath = profilePhotosDirectory.resolve(filename).normalize();
        if (!filePath.startsWith(profilePhotosDirectory)) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Invalid file name.");
        }
        if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            throw new ResourceNotFoundException("Profile photo not found.");
        }

        String lower = filename.toLowerCase();
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            mediaType = MediaType.IMAGE_JPEG;
        } else if (lower.endsWith(".png")) {
            mediaType = MediaType.IMAGE_PNG;
        } else if (lower.endsWith(".webp")) {
            mediaType = MediaType.parseMediaType("image/webp");
        }

        return ResponseEntity.ok()
            .contentType(mediaType)
            .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
            .body(new FileSystemResource(filePath));
    }

    private String getExistingPhotoUrl(User user) {
        if (user.getRole() == UserRole.STUDENT && user.getStudentProfile() != null) {
            return user.getStudentProfile().getPhotoUrl();
        }
        if (user.getRole() == UserRole.FACULTY && user.getFacultyProfile() != null) {
            return user.getFacultyProfile().getPhotoUrl();
        }
        return user.getPhotoUrl();
    }

    private void deleteStoredPhotoFile(String photoUrl) {
        if (photoUrl == null || !photoUrl.startsWith("/api/files/profile-photos/")) {
            return;
        }
        String filename = photoUrl.substring("/api/files/profile-photos/".length());
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return;
        }
        try {
            Path filePath = profilePhotosDirectory.resolve(filename).normalize();
            if (filePath.startsWith(profilePhotosDirectory)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException ignored) {
        }
    }

    private static String detectImageType(byte[] bytes) {
        if (bytes == null || bytes.length < 12) {
            return null;
        }
        // JPEG: starts with FF D8 FF
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return "jpeg";
        }
        // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
        if ((bytes[0] & 0xFF) == 0x89 && (bytes[1] & 0xFF) == 0x50 &&
            (bytes[2] & 0xFF) == 0x4E && (bytes[3] & 0xFF) == 0x47 &&
            (bytes[4] & 0xFF) == 0x0D && (bytes[5] & 0xFF) == 0x0A &&
            (bytes[6] & 0xFF) == 0x1A && (bytes[7] & 0xFF) == 0x0A) {
            return "png";
        }
        // WebP: RIFF .... WEBP
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
            bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "webp";
        }
        return null;
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
