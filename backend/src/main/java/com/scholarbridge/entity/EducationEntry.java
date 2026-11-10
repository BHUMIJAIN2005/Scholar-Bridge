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
public class EducationEntry {
    @Column(name = "degree", length = 180)
    private String degree;

    @Column(name = "institution", length = 240)
    private String institution;

    @Column(name = "education_year", length = 40)
    private String year;
}
