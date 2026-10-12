package com.mesaro.user;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantStatus;
import com.mesaro.security.RestaurantRole;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface UserRestaurantRepository extends JpaRepository<UserRestaurant, UserRestaurantId> {

    List<UserRestaurant> findByUser_IdOrderByRestaurant_Id(Long userId);

    List<UserRestaurant> findByRestaurant_IdOrderByUser_Id(Long restaurantId);

    @Query("SELECT ur FROM UserRestaurant ur JOIN FETCH ur.user WHERE ur.restaurant.id = :restaurantId " +
            "ORDER BY ur.user.id")
    List<UserRestaurant> findByRestaurantIdWithUser(Long restaurantId);

    @Query("SELECT ur FROM UserRestaurant ur JOIN FETCH ur.user WHERE ur.id = :id")
    java.util.Optional<UserRestaurant> findByIdWithUser(UserRestaurantId id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ur FROM UserRestaurant ur JOIN FETCH ur.user JOIN FETCH ur.restaurant WHERE ur.id = :id")
    java.util.Optional<UserRestaurant> findByIdForUpdate(UserRestaurantId id);

    boolean existsByUser_IdAndRestaurant_Id(Long userId, Long restaurantId);

    /** Returns visible restaurants for the user (excludes ARCHIVED and DELETED). */
    @Query("SELECT ur.restaurant FROM UserRestaurant ur " +
            "WHERE ur.user.id = :userId " +
            "AND ur.restaurant.status NOT IN (com.mesaro.restaurant.RestaurantStatus.ARCHIVED, com.mesaro.restaurant.RestaurantStatus.DELETED) " +
            "ORDER BY ur.restaurant.id")
    List<Restaurant> findRestaurantsByUserId(Long userId);

    /** Returns ACTIVE-only restaurants owned by the user, newest first. Used for downgrade preview. */
    @Query("SELECT ur.restaurant FROM UserRestaurant ur " +
            "WHERE ur.user.id = :userId " +
            "AND ur.role = :role " +
            "AND ur.restaurant.status = com.mesaro.restaurant.RestaurantStatus.ACTIVE " +
            "ORDER BY ur.restaurant.createdAt DESC")
    List<Restaurant> findActiveRestaurantsByUserIdAndRoleOrderByCreatedAtDesc(Long userId, RestaurantRole role);

    @Query("SELECT new com.mesaro.auth.AuthRestaurantSummary(r.id, ur.role) " +
            "FROM UserRestaurant ur JOIN ur.restaurant r " +
            "WHERE ur.user.id = :userId " +
            "AND r.status NOT IN (com.mesaro.restaurant.RestaurantStatus.ARCHIVED, com.mesaro.restaurant.RestaurantStatus.DELETED) " +
            "ORDER BY r.id")
    List<com.mesaro.auth.AuthRestaurantSummary> findRestaurantSummariesByUserId(Long userId);

    @Query("SELECT ur FROM UserRestaurant ur JOIN FETCH ur.restaurant WHERE ur.user.id = :userId ORDER BY ur.restaurant.id")
    List<UserRestaurant> findByUserIdWithRestaurant(Long userId);

    @Query("SELECT ur FROM UserRestaurant ur JOIN FETCH ur.user JOIN FETCH ur.restaurant " +
            "WHERE ur.restaurant.id = :restaurantId AND ur.role = :role ORDER BY ur.user.id")
    List<UserRestaurant> findByRestaurantIdAndRoleWithUser(Long restaurantId, RestaurantRole role);

    @Query("SELECT ur.restaurant.id FROM UserRestaurant ur WHERE ur.user.id = :userId AND ur.role = :role")
    List<Long> findRestaurantIdsByUserIdAndRole(Long userId, RestaurantRole role);

    @Query("SELECT ur.role FROM UserRestaurant ur " +
            "WHERE ur.user.id = :userId " +
            "AND ur.restaurant.id = :restaurantId " +
            "AND ur.restaurant.status NOT IN (com.mesaro.restaurant.RestaurantStatus.ARCHIVED, com.mesaro.restaurant.RestaurantStatus.DELETED)")
    java.util.Optional<RestaurantRole> findEffectiveRole(Long userId, Long restaurantId);

    @Modifying
    long deleteByUser_Id(Long userId);

    @Modifying
    long deleteByRestaurant_Id(Long restaurantId);

    /** Counts all owned restaurants regardless of status (legacy, prefer countActiveByUser_IdAndRole). */
    long countByUser_IdAndRole(Long userId, RestaurantRole role);

    /** Counts only ACTIVE owned restaurants. */
    @Query("SELECT COUNT(ur) FROM UserRestaurant ur " +
            "WHERE ur.user.id = :userId " +
            "AND ur.role = :role " +
            "AND ur.restaurant.status = :status")
    long countByUser_IdAndRoleAndRestaurant_Status(Long userId, RestaurantRole role, RestaurantStatus status);
}
