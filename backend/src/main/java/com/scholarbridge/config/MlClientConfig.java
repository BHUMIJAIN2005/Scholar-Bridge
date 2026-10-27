package com.scholarbridge.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class MlClientConfig {
    @Bean
    RestClient mlRestClient(
        RestClient.Builder builder,
        @Value("${app.ml.service-url}") String serviceUrl
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(12));
        return builder.baseUrl(serviceUrl).requestFactory(requestFactory).build();
    }
}