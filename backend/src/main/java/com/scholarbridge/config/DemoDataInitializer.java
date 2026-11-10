package com.scholarbridge.config;

import com.scholarbridge.entity.Application;
import com.scholarbridge.entity.ApplicationStatus;
import com.scholarbridge.entity.Conference;
import com.scholarbridge.entity.EducationEntry;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.FacultyProfile;
import com.scholarbridge.entity.FacultyProjectEntry;
import com.scholarbridge.entity.OpeningStatus;
import com.scholarbridge.entity.Publication;
import com.scholarbridge.entity.ResearchOpening;
import com.scholarbridge.entity.StudentProfile;
import com.scholarbridge.entity.StudentProjectEntry;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.repository.ApplicationRepository;
import com.scholarbridge.repository.ConferenceRepository;
import com.scholarbridge.repository.PublicationRepository;
import com.scholarbridge.repository.ResearchOpeningRepository;
import com.scholarbridge.repository.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DemoDataInitializer implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(DemoDataInitializer.class);
    private static final String DEMO_PASSWORD = "ScholarBridgeDemo2026!";
    private static final List<String> FACULTY_NAMES = List.of(
        "Dr. Mira Sen", "Dr. Arjun Rao", "Dr. Leena Kapoor", "Dr. Kabir Mehta", "Dr. Nisha Iyer"
    );
    private static final List<String> STUDENT_NAMES = List.of(
        "Aarav Sharma", "Anika Verma", "Rohan Gupta", "Meera Joshi",
        "Ishaan Patel", "Sana Khan", "Dev Malhotra", "Tara Nair"
    );
    private static final List<String> AREAS = List.of(
        "Machine Learning", "Cybersecurity", "Cloud and Web Systems", "Algorithms", "Internet of Things"
    );
    private static final List<String> FACULTY_BIOS = List.of(
        "Studies reliable machine learning methods for language and vision applications, with an emphasis on reproducible evaluation.",
        "Researches practical security analysis, privacy-preserving systems, and usable approaches to software assurance.",
        "Builds dependable cloud and web platforms, focusing on distributed services, observability, and resilient design.",
        "Explores algorithm design and optimization for large-scale data and resource-constrained computing.",
        "Develops connected sensing systems and edge intelligence for responsible Internet of Things applications."
    );
    private static final List<String> OPENING_TITLES = List.of(
        "Robust Models for Regional Language Text",
        "Usable Security Checks for Student Web Apps",
        "Observability Patterns for Cloud Services",
        "Approximation Methods for Large Graph Problems",
        "Low-Power Edge Learning for Campus Sensors",
        "Benchmarking Secure Cloud-Based Research Tools"
    );
    private static final List<String> OPENING_DESCRIPTIONS = List.of(
        "Compare compact model approaches on carefully documented text tasks and report limitations alongside results.",
        "Study how clear security feedback can help developers identify common issues earlier in the development process.",
        "Prototype and evaluate practical monitoring patterns for small distributed applications.",
        "Implement and compare algorithmic strategies on reproducible graph workloads.",
        "Explore energy-aware inference for small sensor devices using public or synthetic measurements.",
        "Evaluate secure deployment practices for a research application in a controlled development environment."
    );
    private static final List<String> OPENING_SKILLS = List.of(
        "Python, machine learning, experiment design",
        "JavaScript, web security, testing",
        "Java, cloud computing, observability",
        "Algorithms, data structures, Python",
        "Embedded systems, IoT, machine learning",
        "Cloud, application security, documentation"
    );

    private final boolean enabled;
    private final UserRepository users;
    private final ResearchOpeningRepository openings;
    private final PublicationRepository publications;
    private final ApplicationRepository applications;
    private final ConferenceRepository conferences;
    private final PasswordEncoder passwordEncoder;
    private final BlogDemoDataSeeder blogDemoDataSeeder;

    public DemoDataInitializer(
        @Value("${app.seed.enabled:false}") boolean enabled,
        UserRepository users,
        ResearchOpeningRepository openings,
        PublicationRepository publications,
        ApplicationRepository applications,
        ConferenceRepository conferences,
        PasswordEncoder passwordEncoder,
        BlogDemoDataSeeder blogDemoDataSeeder
    ) {
        this.enabled = enabled;
        this.users = users;
        this.openings = openings;
        this.publications = publications;
        this.applications = applications;
        this.conferences = conferences;
        this.passwordEncoder = passwordEncoder;
        this.blogDemoDataSeeder = blogDemoDataSeeder;
    }

    // Enable with app.seed.enabled=true. Demo logins use ScholarBridgeDemo2026! for every demo.facultyN@example.com and demo.studentN@example.com account.
    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) return;
        if (demoAccountsExist()) {
            logger.info("Skipping demo seed because demo account data already exists; no existing data was changed or deleted.");
            return;
        }

        String passwordHash = passwordEncoder.encode(DEMO_PASSWORD);
        List<User> faculty = createFaculty(passwordHash);
        List<User> students = createStudents(passwordHash);
        createPublications(faculty);
        List<ResearchOpening> seededOpenings = createOpenings(faculty);
        createApplications(students, seededOpenings);
        blogDemoDataSeeder.seed(students.get(0), faculty.get(0));
        createConferenceIfNone(faculty.get(0));

        logger.info("Seeded 5 faculty, 8 students, 15 publications, 6 research openings, 5 published blog posts, comments, reactions, and demo applications.");
        logger.info("Demo faculty logins: demo.faculty1@example.com through demo.faculty5@example.com");
        logger.info("Demo student logins: demo.student1@example.com through demo.student8@example.com");
        logger.info("Shared demo password: {}", DEMO_PASSWORD);
    }

    private boolean demoAccountsExist() {
        for (int index = 1; index <= 5; index++) {
            if (users.existsByEmailIgnoreCase("demo.faculty" + index + "@example.com")) return true;
        }
        for (int index = 1; index <= 8; index++) {
            if (users.existsByEmailIgnoreCase("demo.student" + index + "@example.com")) return true;
        }
        return false;
    }

    private List<User> createFaculty(String passwordHash) {
        List<User> seeded = new ArrayList<>();
        for (int index = 0; index < FACULTY_NAMES.size(); index++) {
            User user = createUser(FACULTY_NAMES.get(index), "demo.faculty" + (index + 1) + "@example.com",
                UserRole.FACULTY, passwordHash);
            FacultyProfile profile = new FacultyProfile();
            profile.setUser(user);
            profile.setDepartment("Computer Science & Engineering");
            profile.setResearchDomains(AREAS.get(index));
            profile.setDesignation(index == 0 ? "Associate Professor" : "Assistant Professor");
            profile.setQualifications("Ph.D. in Computer Science");
            profile.setBio(FACULTY_BIOS.get(index));
            profile.setResearchInterests(List.of(AREAS.get(index), relatedInterest(index), "Research methods"));
            profile.setOfficeRoom("CSE Block, Room " + (201 + index));
            profile.setOfficeHours("Tuesday and Thursday, 2:00–4:00 PM");
            profile.setScholarUrl("https://scholar.google.com/");
            profile.setOrcidUrl("https://orcid.org/0000-0000-0000-0000");
            profile.setResearchGateUrl("https://www.researchgate.net/");
            profile.setLinkedinUrl("https://www.linkedin.com/");
            profile.setWebsiteUrl("https://example.com/");
            profile.setCitationsCount(40 + index * 23);
            profile.setHIndex(4 + index * 2);
            profile.setI10Index(2 + index * 2);
            profile.setStatsAsOf(LocalDate.now().minusMonths(1));
            profile.setAcceptingStudents(index != 1);
            profile.setApprovalStatus(FacultyApprovalStatus.APPROVED);
            profile.setEducation(List.of(education("Ph.D.", "Fictional Institute of Technology", "2016")));
            profile.setAwards(List.of("Fictional Early Career Research Award " + (index + 1)));
            profile.setProjects(List.of(facultyProject(
                "Open " + AREAS.get(index) + " Research Initiative",
                "Fictional Research Council",
                "2024–2026",
                "Principal Investigator"
            )));
            user.setApprovalStatus(FacultyApprovalStatus.APPROVED);
            user.setFacultyProfile(profile);
            seeded.add(users.save(user));
        }
        return seeded;
    }

    private List<User> createStudents(String passwordHash) {
        List<User> seeded = new ArrayList<>();
        List<String> skillSets = List.of(
            "Python, PyTorch, data analysis", "Java, secure coding, testing",
            "TypeScript, React, cloud services", "C++, algorithms, graph theory",
            "Python, IoT, embedded systems", "Java, Spring Boot, databases",
            "Python, machine learning, visualization", "Linux, networking, cybersecurity"
        );
        for (int index = 0; index < STUDENT_NAMES.size(); index++) {
            User user = createUser(STUDENT_NAMES.get(index), "demo.student" + (index + 1) + "@example.com",
                UserRole.STUDENT, passwordHash);
            StudentProfile profile = new StudentProfile();
            profile.setUser(user);
            profile.setYear(yearOfStudy(2 + index % 3));
            profile.setSkills(skillSets.get(index));
            profile.setSkillTags(List.of(skillSets.get(index).split(", ")));
            profile.setInterests(List.of(AREAS.get(index % AREAS.size()), "Collaborative research"));
            profile.setProjects(List.of(studentProject(
                "Student Research Prototype " + (index + 1),
                "A fictional, reproducible prototype exploring " + AREAS.get(index % AREAS.size()) + "."
            )));
            profile.setGithubUrl("https://github.com/");
            profile.setLinkedinUrl("https://www.linkedin.com/");
            user.setStudentProfile(profile);
            seeded.add(users.save(user));
        }
        return seeded;
    }

    private void createPublications(List<User> faculty) {
        for (int index = 0; index < faculty.size(); index++) {
            for (int publicationIndex = 1; publicationIndex <= 3; publicationIndex++) {
                Publication publication = new Publication();
                publication.setFaculty(faculty.get(index));
                publication.setTitle(AREAS.get(index) + ": A Reproducible Study " + publicationIndex);
                publication.setAuthors(FACULTY_NAMES.get(index) + ", Demo Research Group");
                publication.setVenue("Fictional Journal of Computing");
                publication.setYear(2023 + publicationIndex);
                publication.setDoi("10.0000/demo." + (index + 1) + "." + publicationIndex);
                publication.setUrl("https://example.com/publications/demo-" + (index + 1) + "-" + publicationIndex);
                publications.save(publication);
            }
        }
    }

    private List<ResearchOpening> createOpenings(List<User> faculty) {
        List<ResearchOpening> seeded = new ArrayList<>();
        for (int index = 0; index < OPENING_TITLES.size(); index++) {
            ResearchOpening opening = new ResearchOpening();
            opening.setFaculty(faculty.get(index % faculty.size()));
            opening.setTitle(OPENING_TITLES.get(index));
            opening.setDescription(OPENING_DESCRIPTIONS.get(index));
            opening.setRequiredSkills(OPENING_SKILLS.get(index));
            opening.setSeats(index % 2 + 1);
            opening.setStatus(OpeningStatus.OPEN);
            seeded.add(openings.save(opening));
        }
        return seeded;
    }

    private void createApplications(List<User> students, List<ResearchOpening> seededOpenings) {
        createApplication(students.get(0), seededOpenings.get(0), ApplicationStatus.ACCEPTED);
        createApplication(students.get(1), seededOpenings.get(0), ApplicationStatus.PENDING);
        createApplication(students.get(2), seededOpenings.get(1), ApplicationStatus.REJECTED);
        createApplication(students.get(3), seededOpenings.get(2), ApplicationStatus.PENDING);
        createApplication(students.get(4), seededOpenings.get(3), ApplicationStatus.ACCEPTED);
        createApplication(students.get(5), seededOpenings.get(4), ApplicationStatus.PENDING);
        createApplication(students.get(6), seededOpenings.get(5), ApplicationStatus.REJECTED);
    }

    private void createApplication(User student, ResearchOpening opening, ApplicationStatus status) {
        Application application = new Application();
        application.setStudent(student);
        application.setOpening(opening);
        application.setStatementOfInterest(
            "I am interested in this project and would like to contribute my skills while learning from the research team."
        );
        application.setStatus(status);
        applications.save(application);
    }

    private void createConferenceIfNone(User faculty) {
        if (conferences.count() > 0) return;
        Conference conference = new Conference();
        conference.setCreatedBy(faculty);
        conference.setName("ScholarBridge Research Symposium");
        conference.setDepartment("Computer Science & Engineering");
        conference.setSubmissionDeadline(Instant.now().plus(90, ChronoUnit.DAYS));
        conference.setEventDate(Instant.now().plus(120, ChronoUnit.DAYS));
        conference.setTracks(List.of("Machine Learning", "Cybersecurity", "Cloud and Web Systems", "Algorithms", "Internet of Things"));
        conferences.save(conference);
    }

    private User createUser(String name, String email, UserRole role, String passwordHash) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordHash);
        user.setRole(role);
        user.setApprovalStatus(FacultyApprovalStatus.APPROVED);
        return user;
    }

    private String relatedInterest(int facultyIndex) {
        return switch (facultyIndex) {
            case 0 -> "Natural language processing";
            case 1 -> "Privacy engineering";
            case 2 -> "Distributed systems";
            case 3 -> "Combinatorial optimization";
            default -> "Edge computing";
        };
    }

    private String yearOfStudy(int year) {
        String suffix = switch (year) {
            case 2 -> "nd";
            case 3 -> "rd";
            default -> "th";
        };
        return year + suffix + " Year B.Tech CSE";
    }

    private EducationEntry education(String degree, String institution, String year) {
        EducationEntry entry = new EducationEntry();
        entry.setDegree(degree);
        entry.setInstitution(institution);
        entry.setYear(year);
        return entry;
    }

    private FacultyProjectEntry facultyProject(String title, String fundingAgency, String years, String role) {
        FacultyProjectEntry project = new FacultyProjectEntry();
        project.setTitle(title);
        project.setFundingAgency(fundingAgency);
        project.setYears(years);
        project.setRole(role);
        return project;
    }

    private StudentProjectEntry studentProject(String title, String description) {
        StudentProjectEntry project = new StudentProjectEntry();
        project.setTitle(title);
        project.setDescription(description);
        return project;
    }
}
