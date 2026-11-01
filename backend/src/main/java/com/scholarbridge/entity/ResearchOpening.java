package com.scholarbridge.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "research_openings")
@Getter
@Setter
@NoArgsConstructor
public class ResearchOpening {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "faculty_id", nullable = false)
    private User faculty;

    @Column(length = 180)
    private String title;

    @Column(length = 10000)
    private String description;

    @Column(length = 1000)
    private String requiredSkills;
    private int seats;

    @Enumerated(EnumType.STRING)
    private OpeningStatus status = OpeningStatus.OPEN;

    private Instant createdAt = Instant.now();
}