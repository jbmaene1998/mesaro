package com.mesaro.restaurant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RestaurantRepository extends JpaRepository<Restaurant, Long> {

    Optional<Restaurant> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Restaurant> findByStatusAndDeletedAtUtcBefore(RestaurantStatus status, Instant cutoff);

    @Query("SELECT ur.restaurant FROM UserRestaurant ur " +
            "WHERE ur.user.id = :userId " +
            "AND ur.role = com.mesaro.security.RestaurantRole.OWNER " +
            "AND ur.restaurant.status = com.mesaro.restaurant.RestaurantStatus.ACTIVE")
    List<Restaurant> findActiveByOwnerUserId(Long userId);
}
