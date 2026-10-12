package com.mesaro.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class FlywaySafetyConfigTest {

    @Test
    void productionProfile_disablesFlywayBaselineAndDemoSeed() throws IOException {
        String prodConfig = readClasspathFile("application-prod.yml");

        assertThat(prodConfig).contains("baseline-on-migrate: false");
        assertThat(prodConfig).contains("seed_demo_data: false");
    }

    @Test
    void developmentProfile_keepsDemoSeedEnabled() throws IOException {
        String devConfig = readClasspathFile("application-dev.yml");

        assertThat(devConfig).contains("locations: classpath:db/migration,classpath:db/seed");
        assertThat(devConfig).contains("seed_demo_data: true");
        assertThat(devConfig).contains("url: ${DB_URL:jdbc:postgresql://localhost:5432/mesaro_dev}");
        assertThat(devConfig).contains("username: ${DB_USER:mesaro}");
        assertThat(devConfig).contains("password: ${DB_PASS:mesaro}");
    }

    @Test
    void nonDevCleanupMigration_isGuardedByFlywayPlaceholder() throws IOException {
        String migration = readClasspathFile("db/migration/V2__cleanup_demo_seed_for_non_dev.sql");

        assertThat(migration).contains("${seed_demo_data}");
        assertThat(migration).contains("demo-restaurant");
        assertThat(migration).contains("admin@demo.com");
    }

    @Test
    void productionProfile_requiresExplicitDatabaseEnvVars() throws IOException {
        String prodConfig = readClasspathFile("application-prod.yml");

        assertThat(prodConfig).contains("locations: classpath:db/migration");
        assertThat(prodConfig).doesNotContain("db/seed");
        assertThat(prodConfig).contains("url: ${DB_URL}");
        assertThat(prodConfig).contains("username: ${DB_USER}");
        assertThat(prodConfig).contains("password: ${DB_PASS}");
    }

    @Test
    void devSeedScript_isIdempotentAndContainsUsableDemoEntities() throws IOException {
        String seed = readClasspathFile("db/seed/R__dev_seed_demo_data.sql");

        assertThat(seed).contains("demo-restaurant");
        assertThat(seed).contains("admin@demo.com");
        assertThat(seed).contains("ON CONFLICT (slug) DO NOTHING");
        assertThat(seed).contains("ON CONFLICT (email) DO UPDATE");
        assertThat(seed).contains("ON CONFLICT (user_id, restaurant_id) DO NOTHING");
    }

    private String readClasspathFile(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }
}
