package com.scholarbridge.config;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GoogleAuthConfig {
    @Bean
    GoogleIdTokenVerifier googleIdTokenVerifier(@Value("${app.google.client-id:}") String clientId)
        throws GeneralSecurityException, IOException {
        return new GoogleIdTokenVerifier.Builder(
            GoogleNetHttpTransport.newTrustedTransport(),
            JacksonFactory.getDefaultInstance()
        ).setAudience(clientId.isBlank() ? List.of() : List.of(clientId)).build();
    }
}
