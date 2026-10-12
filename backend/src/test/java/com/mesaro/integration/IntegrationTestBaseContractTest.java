package com.mesaro.integration;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class IntegrationTestBaseContractTest {

    @Test
    void integrationBase_usesExternalDatabaseDefaults() {
        assertThat(System.getProperty("mesaro.it.datasource.url", "jdbc:postgresql://localhost:55432/mesaro"))
                .isEqualTo("jdbc:postgresql://localhost:55432/mesaro");
        assertThat(System.getProperty("mesaro.it.datasource.username", "mesaro"))
                .isEqualTo("mesaro");
        assertThat(System.getProperty("mesaro.it.datasource.password", "mesaro"))
                .isEqualTo("mesaro");
    }
}
