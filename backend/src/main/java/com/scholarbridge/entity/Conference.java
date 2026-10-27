package com.scholarbridge.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "conferences")
@Getter
@Setter
@NoArgsConstructor
public class Conference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    private String name;
    private String department;
    private Instant submissionDeadline;
    private Instant eventDate;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "conference_tracks", joinColumns = @JoinColumn(name = "conference_id"))
    @Column(name = "track", nullable = false)
    @OrderColumn(name = "track_order")
    private List<String> tracks = new ArrayList<>();
}