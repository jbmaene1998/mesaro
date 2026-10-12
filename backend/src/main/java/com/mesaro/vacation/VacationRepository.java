package com.mesaro.vacation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface VacationRepository extends JpaRepository<Vacation, Long> {

    List<Vacation> findByRestaurantIdOrderByStartDateDesc(Long restaurantId);

    @Query("SELECT v FROM Vacation v JOIN FETCH v.restaurant WHERE v.restaurant.id = :restaurantId " +
            "ORDER BY v.startDate DESC")
    List<Vacation> findByRestaurantIdWithRestaurant(Long restaurantId);

    List<Vacation> findByRestaurantIdAndTypeOrderByStartDateDesc(Long restaurantId, VacationType type);

    List<Vacation> findByRestaurantIdAndUserIdOrderByStartDateDesc(Long restaurantId, Long userId);

    @Query("SELECT v FROM Vacation v JOIN FETCH v.restaurant WHERE v.id = :id")
    Optional<Vacation> findByIdWithRestaurant(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM Vacation v JOIN FETCH v.restaurant WHERE v.id = :id")
    Optional<Vacation> findByIdWithRestaurantForUpdate(Long id);

    @Modifying
    @Query(value = """
            UPDATE vacation
            SET status = 'APPROVED',
                approved_by = :approvedByUserId,
                approved_at = :approvedAt,
                version = version + 1
            WHERE id = :vacationId
              AND status = 'PENDING'
            """, nativeQuery = true)
    int approveIfPending(Long vacationId, Long approvedByUserId, Instant approvedAt);

    @Modifying
    @Query(value = """
            UPDATE vacation
            SET status = 'REJECTED',
                approved_by = :rejectedByUserId,
                approved_at = :rejectedAt,
                version = version + 1
            WHERE id = :vacationId
              AND status = 'PENDING'
            """, nativeQuery = true)
    int rejectIfPending(Long vacationId, Long rejectedByUserId, Instant rejectedAt);

    @Query("SELECT v FROM Vacation v WHERE v.restaurant.id = :restaurantId " +
            "AND v.type = 'RESTAURANT_CLOSURE' " +
            "AND v.status = 'APPROVED' " +
            "AND v.startDate <= :date AND v.endDate >= :date")
    List<Vacation> findActiveClosuresOnDate(Long restaurantId, LocalDate date);

    @Query("SELECT v FROM Vacation v WHERE v.restaurant.id = :restaurantId " +
            "AND v.type = 'RESTAURANT_CLOSURE' " +
            "AND v.status = 'APPROVED' " +
            "AND v.startDate <= :endDate AND v.endDate >= :startDate " +
            "ORDER BY v.startDate")
    List<Vacation> findClosuresBetween(Long restaurantId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT v FROM Vacation v WHERE v.restaurant.id = :restaurantId " +
            "AND v.type = 'STAFF_VACATION' " +
            "AND v.status = :status " +
            "ORDER BY v.startDate")
    List<Vacation> findStaffVacationsByStatus(Long restaurantId, VacationStatus status);

    @Query("SELECT v FROM Vacation v WHERE v.restaurant.id = :restaurantId " +
            "AND v.userId = :userId " +
            "AND v.status IN ('PENDING', 'APPROVED') " +
            "AND v.startDate <= :endDate AND v.endDate >= :startDate")
    List<Vacation> findOverlappingVacationsForUser(Long restaurantId, Long userId,
                                                    LocalDate startDate, LocalDate endDate);

    @Query("SELECT v FROM Vacation v WHERE v.restaurant.id = :restaurantId " +
            "AND v.type = 'RESTAURANT_CLOSURE' " +
            "AND v.status = 'APPROVED' " +
            "AND v.startDate <= :endDate AND v.endDate >= :startDate " +
            "AND (:excludeId IS NULL OR v.id != :excludeId)")
    List<Vacation> findOverlappingClosures(Long restaurantId, LocalDate startDate, LocalDate endDate, Long excludeId);

    @Query("SELECT CASE WHEN COUNT(v) > 0 THEN true ELSE false END FROM Vacation v " +
            "WHERE v.restaurant.id = :restaurantId " +
            "AND v.type = 'RESTAURANT_CLOSURE' " +
            "AND v.status = 'APPROVED' " +
            "AND v.startDate <= :date AND v.endDate >= :date")
    boolean isRestaurantClosedOnDate(Long restaurantId, LocalDate date);

    @Query("SELECT v FROM Vacation v WHERE v.restaurant.id = :restaurantId " +
            "AND v.type = 'STAFF_VACATION' " +
            "AND v.status IN ('PENDING', 'APPROVED') " +
            "AND v.startDate <= :date AND v.endDate >= :date")
    List<Vacation> findStaffVacationsOnDate(Long restaurantId, LocalDate date);

    @Modifying
    long deleteByRestaurant_Id(Long restaurantId);
}
