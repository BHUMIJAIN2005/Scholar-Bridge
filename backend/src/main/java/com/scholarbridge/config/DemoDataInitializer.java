package com.scholarbridge.config;

import com.scholarbridge.entity.Conference;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.entity.OpeningStatus;
import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.StudentProfile;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.repository.ConferenceRepository;
import com.scholarbridge.repository.ResearchOpeningRepository;
import com.scholarbridge.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Configuration
public class DemoDataInitializer {
    @Bean
    CommandLineRunner seedDemoData(
        @Value("${app.seed.enabled:false}") boolean enabled,
        UserRepository users,
        ResearchOpeningRepository openings,
        ConferenceRepository conferences,
        PasswordEncoder passwordEncoder
    ) {
        return args -> {
            if (enabled) initialize(users, openings, conferences, passwordEncoder);
        };
    }

    @Transactional
    void initialize(
        UserRepository users,
        ResearchOpeningRepository openings,
        ConferenceRepository conferences,
        PasswordEncoder passwordEncoder
    ) {
        if (users.existsByEmailIgnoreCase("faculty@scholarbridge.edu")) return;

        User faculty = createUser(users, passwordEncoder, "Dr. Ananya Sen", "faculty@scholarbridge.edu", UserRole.FACULTY);
        FacultyProfile facultyProfile = new FacultyProfile();
        facultyProfile.setUser(faculty);
        facultyProfile.setDepartment("Computer Science & Engineering");
        facultyProfile.setResearchDomains("Machine Learning, NLP, Distributed Systems, Computer Vision");
        faculty.setFacultyProfile(facultyProfile);
        users.save(faculty);

        User student = createUser(users, passwordEncoder, "Priya Sharma", "student@scholarbridge.edu", UserRole.STUDENT);
        StudentProfile studentProfile = new StudentProfile();
        studentProfile.setUser(student);
        studentProfile.setSkills("Python, PyTorch, NLP, Distributed Systems");
        studentProfile.setYear("3rd Year B.Tech CSE");
        student.setStudentProfile(studentProfile);
        users.save(student);

        ResearchOpening opening = new ResearchOpening();
        opening.setFaculty(faculty);
        opening.setTitle("Efficient Language Models for Low-Resource Languages");
        opening.setDescription("Explore compact language models and evaluation methods for regional languages. The student will build reproducible experiments and document results.");
        opening.setRequiredSkills("Python, NLP, PyTorch");
        opening.setSeats(2);
        opening.setStatus(OpeningStatus.OPEN);
        openings.save(opening);

        Conference conference = new Conference();
        conference.setCreatedBy(faculty);
        conference.setName("ScholarBridge Research Symposium");
        conference.setDepartment("Computer Science & Engineering");
        conference.setSubmissionDeadline(Instant.now().plus(90, ChronoUnit.DAYS));
        conference.setEventDate(Instant.now().plus(120, ChronoUnit.DAYS));
        conference.setTracks(List.of("Machine Learning", "Natural Language Processing", "Computer Vision", "Distributed Systems", "Cybersecurity"));
        conferences.save(conference);
    }

    private User createUser(UserRepository users, PasswordEncoder passwordEncoder, String name, String email, UserRole role) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setRole(role);
        return users.save(user);
    }
}