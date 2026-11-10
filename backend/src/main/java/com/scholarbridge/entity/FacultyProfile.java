package com.scholarbridge.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "faculty_profiles")
@Getter
@Setter
@NoArgsConstructor
public class FacultyProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String department;

    @Column(length = 1000)
    private String researchDomains;

    @Column(length = 500)
    private String photoUrl;
    private String designation;

    @Column(length = 2000)
    private String qualifications;

    @Column(length = 5000)
    private String bio;

    @ElementCollection
    @CollectionTable(name = "faculty_research_interests", joinColumns = @JoinColumn(name = "faculty_profile_id"))
    @Column(name = "interest", length = 120)
    @Fetch(FetchMode.SUBSELECT)
    @BatchSize(size = 32)
    private List<String> researchInterests = new ArrayList<>();

    private String officeRoom;
    private String officeHours;
    @Column(length = 500)
    private String scholarUrl;

    @Column(length = 500)
    private String orcidUrl;

    @Column(length = 500)
    private String researchGateUrl;

    @Column(length = 500)
    private String linkedinUrl;

    @Column(length = 500)
    private String websiteUrl;
    private Integer citationsCount;
    private Integer hIndex;
    private Integer i10Index;
    private LocalDate statsAsOf;
    private Boolean acceptingStudents;

    @ElementCollection
    @CollectionTable(name = "faculty_education", joinColumns = @JoinColumn(name = "faculty_profile_id"))
    @Fetch(FetchMode.SUBSELECT)
    @BatchSize(size = 32)
    private List<EducationEntry> education = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "faculty_awards", joinColumns = @JoinColumn(name = "faculty_profile_id"))
    @Column(name = "award", length = 300)
    @Fetch(FetchMode.SUBSELECT)
    @BatchSize(size = 32)
    private List<String> awards = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "faculty_projects", joinColumns = @JoinColumn(name = "faculty_profile_id"))
    @Fetch(FetchMode.SUBSELECT)
    @BatchSize(size = 32)
    private List<FacultyProjectEntry> projects = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private FacultyApprovalStatus approvalStatus = FacultyApprovalStatus.APPROVED;
}