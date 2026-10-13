package com.mesaro.gdpr;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.auth.RefreshTokenRepository;
import com.mesaro.config.AppProperties;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
import com.mesaro.restaurant.RestaurantService;
import com.mesaro.restaurant.RestaurantStatus;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserAccountStatus;
import com.mesaro.user.UserRestaurantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

@Service
public class DeletedEntityPurgeService {

    private static final Logger log = LoggerFactory.getLogger(DeletedEntityPurgeService.class);

    private final AppProperties appProperties;
    private final RestaurantRepository restaurantRepository;
    private final RestaurantService restaurantService;
    private final UserAccountRepository userAccountRepository;
    private final UserRestaurantRepository userRestaurantRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    public DeletedEntityPurgeService(AppProperties appProperties,
                                     RestaurantRepository restaurantRepository,
                                     RestaurantService restaurantService,
                                     UserAccountRepository userAccountRepository,
                                     UserRestaurantRepository userRestaurantRepository,
                                     RefreshTokenRepository refreshTokenRepository,
                                     JdbcTemplate jdbcTemplate,
                                     AuditService auditService) {
        this.appProperties = appProperties;
        this.restaurantRepository = restaurantRepository;
        this.restaurantService = restaurantService;
        this.userAccountRepository = userAccountRepository;
        this.userRestaurantRepository = userRestaurantRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.auditService = auditService;
    }

    @Transactional
    @Scheduled(cron = "${app.gdpr.purge-cron:0 30 2 * * *}")
    public void purgeDeletedEntities() {
        if (!appProperties.getGdpr().isRetentionEnabled()) {
            return;
        }

        Instant cutoff = Instant.now().minus(appProperties.getGdpr().getPurgeDeletedAfterDays(), ChronoUnit.DAYS);
        int purgedRestaurants = purgeDeletedRestaurants(cutoff);
        int purgedUsers = purgeDeletedUsers(cutoff);

        if (purgedRestaurants > 0 || purgedUsers > 0) {
            log.info("Deleted entity purge complete: restaurants={}, users={}", purgedRestaurants, purgedUsers);
            auditService.record(
                    AuditEventType.GDPR_ENTITY_PURGED,
                    null,
                    null,
                    null,
                    "GDPR",
                    Map.of("purgedRestaurants", purgedRestaurants, "purgedUsers", purgedUsers)
            );
        }
    }

    private int purgeDeletedRestaurants(Instant cutoff) {
        List<Restaurant> restaurantsToPurge = restaurantRepository.findByStatusAndDeletedAtUtcBefore(
                RestaurantStatus.DELETED, cutoff);
        for (Restaurant restaurant : restaurantsToPurge) {
            restaurantService.hardDelete(restaurant.getId());
        }
        return restaurantsToPurge.size();
    }

    private int purgeDeletedUsers(Instant cutoff) {
        List<UserAccount> usersToPurge = userAccountRepository.findByStatusAndDeletedAtUtcBefore(
                UserAccountStatus.DELETED, cutoff);
        for (UserAccount user : usersToPurge) {
            Long userId = user.getId();
            List<Restaurant> ownedRestaurants = restaurantRepository.findActiveByOwnerUserId(userId);
            for (Restaurant restaurant : ownedRestaurants) {
                restaurantService.archive(restaurant.getId());
                log.info("Archived restaurant {} owned by purged user {}", restaurant.getId(), userId);
            }
            refreshTokenRepository.deleteByUser_Id(userId);
            userRestaurantRepository.deleteByUser_Id(userId);
            userAccountRepository.delete(user);
        }
        return usersToPurge.size();
    }

    @Scheduled(cron = "0 30 2 * * *")
    @Transactional
    public void cleanupExpiredRefreshTokens() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
        int deleted = jdbcTemplate.update(
                "DELETE FROM refresh_token WHERE revoked = true OR expires_at_utc < ?",
                cutoff
        );
        if (deleted > 0) {
            log.info("Purged {} expired/revoked refresh_token rows", deleted);
        }
    }

    @Scheduled(cron = "0 45 2 * * *")
    @Transactional
    public void cleanupExpiredPasswordResets() {
        int deleted = jdbcTemplate.update(
                "DELETE FROM password_reset WHERE used_at_utc IS NULL AND expires_at_utc < NOW() - INTERVAL '1 hour'"
        );
        if (deleted > 0) {
            log.info("Purged {} expired unused password_reset tokens", deleted);
        }
    }
}
