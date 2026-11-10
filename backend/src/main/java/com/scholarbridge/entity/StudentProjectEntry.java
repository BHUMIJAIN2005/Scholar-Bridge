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
public class StudentProjectEntry {
    @Column(name = "title", length = 240)
    private String title;

    @Column(name = "description", length = 2000)
    private String description;
}
