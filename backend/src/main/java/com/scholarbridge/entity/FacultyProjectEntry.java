package com.scholarbridge.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
public class FacultyProjectEntry {
    @Column(name = "title", length = 240)
    private String title;

    @Column(name = "funding_agency", length = 240)
    private String fundingAgency;

    @Column(name = "years", length = 100)
    private String years;

    @Column(name = "project_role", length = 160)
    private String role;
}
