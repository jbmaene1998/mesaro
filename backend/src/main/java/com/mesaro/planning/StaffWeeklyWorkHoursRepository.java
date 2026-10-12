package com.mesaro.planning;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StaffWeeklyWorkHoursRepository extends JpaRepository<StaffWeeklyWorkHours, Long> {

    @Query("SELECT w FROM StaffWeeklyWorkHours w " +
            "JOIN FETCH w.user " +
            "WHERE w.restaurant.id = :restaurantId AND w.weekStartDate = :weekStartDate")
    List<StaffWeeklyWorkHours> findByRestaurantAndWeekStartWithUser(Long restaurantId, LocalDate weekStartDate);

    @Query("SELECT w FROM StaffWeeklyWorkHours w " +
            "JOIN FETCH w.user " +
            "JOIN FETCH w.restaurant " +
            "WHERE w.restaurant.id = :restaurantId " +
            "AND w.user.id = :userId " +
            "AND w.weekStartDate = :weekStartDate")
    Optional<StaffWeeklyWorkHours> findByRestaurantUserAndWeekStartWithAssociations(Long restaurantId, Long userId, LocalDate weekStartDate);
}
