package com.mesaro.hold;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class HoldExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(HoldExpiryScheduler.class);

    private final HoldService holdService;

    public HoldExpiryScheduler(HoldService holdService) {
        this.holdService = holdService;
    }

    @Scheduled(fixedDelayString = "${app.hold.cleanup-interval-ms:60000}")
    public void purgeExpiredHolds() {
        int deleted = holdService.cleanupExpiredHolds();
        if (deleted > 0) {
            log.info("Hold expiry cleanup: removed {} expired hold(s)", deleted);
        }
    }
}
