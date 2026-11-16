package com.scholarbridge.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.scholarbridge.dto.ApiDtos.FacultyAiResearchProfileDto;
import com.scholarbridge.entity.FacultyProfile;
import java.util.List;
import org.junit.jupiter.api.Test;

class FacultyResearchProfileServiceTest {
    private final FacultyResearchProfileService service = new FacultyResearchProfileService(
        null, null, null, null, null
    );

    @Test
    void confirmedAiProfileDoesNotOverwriteManuallyMaintainedResearchFields() {
        FacultyProfile profile = new FacultyProfile();
        profile.setResearchInterests(List.of("Manual interest"));
        profile.setResearchDomains("Manual domain");
        FacultyAiResearchProfileDto aiProfile = aiProfile(
            List.of("AI interest"), List.of("AI domain")
        );

        service.synchronizePublicResearchFields(profile, aiProfile);

        assertEquals(List.of("Manual interest"), profile.getResearchInterests());
        assertEquals("Manual domain", profile.getResearchDomains());
    }

    @Test
    void confirmedAiProfileSeedsResearchFieldsWhenTheyAreEmpty() {
        FacultyProfile profile = new FacultyProfile();
        FacultyAiResearchProfileDto aiProfile = aiProfile(
            List.of("AI interest"), List.of("AI domain", "Second domain")
        );

        service.synchronizePublicResearchFields(profile, aiProfile);

        assertEquals(List.of("AI interest"), profile.getResearchInterests());
        assertEquals("AI domain, Second domain", profile.getResearchDomains());
    }

    private FacultyAiResearchProfileDto aiProfile(List<String> interests, List<String> domains) {
        return new FacultyAiResearchProfileDto(
            interests, domains, List.of(), List.of(), List.of(), List.of(), List.of(), "Research embedding text"
        );
    }
}
