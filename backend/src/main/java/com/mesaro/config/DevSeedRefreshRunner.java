package com.mesaro.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.DatabasePopulatorUtils;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;

/**
 * Re-runs dev seed SQL on startup so date-relative records stay fresh.
 * Flyway repeatable migrations only run when checksum changes, so this
 * runner keeps demo data dynamic across restarts.
 */
@Component
@Profile("dev")
@ConditionalOnProperty(name = "app.seed.refresh-on-startup", havingValue = "true", matchIfMissing = true)
public class DevSeedRefreshRunner {

    private static final Logger log = LoggerFactory.getLogger(DevSeedRefreshRunner.class);
    private static final String DEV_SEED_RESOURCE = "db/seed/R__dev_seed_demo_data.sql";

    private final DataSource dataSource;

    public DevSeedRefreshRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void refreshSeedData() {
        ClassPathResource seedScript = new ClassPathResource(DEV_SEED_RESOURCE);
        if (!seedScript.exists()) {
            log.warn("Dev seed refresh skipped: {} not found", DEV_SEED_RESOURCE);
            return;
        }

        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.setSqlScriptEncoding(StandardCharsets.UTF_8.name());
        populator.setContinueOnError(false);
        populator.addScript(seedScript);

        DatabasePopulatorUtils.execute(populator, dataSource);
        log.info("Dev seed refresh completed from {}", DEV_SEED_RESOURCE);
    }
}
