package com.scholarbridge.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "student_profiles")
@Getter
@Setter
@NoArgsConstructor
public class StudentProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String skills;
    @Column(name = "academic_year")
    private String year;

    @Column(length = 500)
    private String photoUrl;

    @ElementCollection
    @CollectionTable(name = "student_skill_tags", joinColumns = @JoinColumn(name = "student_profile_id"))
    @Column(name = "skill", length = 120)
    @Fetch(FetchMode.SUBSELECT)
    @BatchSize(size = 32)
    private List<String> skillTags = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "student_interests", joinColumns = @JoinColumn(name = "student_profile_id"))
    @Column(name = "interest", length = 120)
    @Fetch(FetchMode.SUBSELECT)
    @BatchSize(size = 32)
    private List<String> interests = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "student_projects", joinColumns = @JoinColumn(name = "student_profile_id"))
    @Fetch(FetchMode.SUBSELECT)
    @BatchSize(size = 32)
    private List<StudentProjectEntry> projects = new ArrayList<>();

    @Column(length = 500)
    private String githubUrl;

    @Column(length = 500)
    private String linkedinUrl;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    private StudentVisibility visibility = StudentVisibility.ALL_FACULTY;
}