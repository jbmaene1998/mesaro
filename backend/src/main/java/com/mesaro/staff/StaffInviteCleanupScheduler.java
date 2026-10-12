package com.mesaro.staff;

import com.mesaro.infra.TimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class StaffInviteCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(StaffInviteCleanupScheduler.class);

    private final StaffInviteRepository staffInviteRepository;
    private final TimeService timeService;

    public StaffInviteCleanupScheduler(StaffInviteRepository staffInviteRepository,
                                       TimeService timeService) {
        this.staffInviteRepository = staffInviteRepository;
        this.timeService = timeService;
    }

    @Scheduled(cron = "${app.staff.invite-cleanup-cron:0 0 * * * *}")
    @Transactional
    public void revokeExpiredInvites() {
        Instant now = timeService.now();
        int revoked = staffInviteRepository.revokeExpiredInvites(now, now);
        if (revoked > 0) {
            log.info("Revoked {} expired staff invite(s)", revoked);
        }
    }
}
