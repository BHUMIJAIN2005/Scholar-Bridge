package com.scholarbridge.config;

import jakarta.persistence.EntityManager;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class StudentVisibilityMigration implements ApplicationRunner {
    private final EntityManager entityManager;

    public StudentVisibilityMigration(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        entityManager.createNativeQuery("""
            update student_profiles
            set visibility = 'ALL_USERS'
            where visibility is null or visibility = 'ALL_FACULTY'
            """).executeUpdate();
    }
}
