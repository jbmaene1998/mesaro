package com.mesaro.planning;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StaffShiftAssignmentRepository extends JpaRepository<StaffShiftAssignment, Long> {

    @Query("SELECT a FROM StaffShiftAssignment a " +
            "JOIN FETCH a.shift " +
            "JOIN FETCH a.user " +
            "WHERE a.restaurant.id = :restaurantId AND a.serviceDate = :serviceDate " +
            "ORDER BY a.shift.startTime, a.user.email")
    List<StaffShiftAssignment> findByRestaurantAndDateWithAssociations(Long restaurantId, LocalDate serviceDate);

    @Query("SELECT a FROM StaffShiftAssignment a " +
            "JOIN FETCH a.shift " +
            "JOIN FETCH a.user " +
            "JOIN FETCH a.restaurant " +
            "WHERE a.id = :id")
    Optional<StaffShiftAssignment> findByIdWithAssociations(Long id);

    boolean existsByShift_IdAndUser_IdAndServiceDate(Long shiftId, Long userId, LocalDate serviceDate);

    boolean existsByShift_Id(Long shiftId);

    @Query("SELECT a FROM StaffShiftAssignment a " +
            "JOIN FETCH a.shift " +
            "WHERE a.restaurant.id = :restaurantId " +
            "AND a.user.id = :userId " +
            "AND a.serviceDate >= :startDate " +
            "AND a.serviceDate <= :endDate")
    List<StaffShiftAssignment> findByRestaurant_IdAndUser_IdAndServiceDateBetween(
            Long restaurantId, Long userId, LocalDate startDate, LocalDate endDate);

    @Modifying
    long deleteByRestaurant_IdAndUser_IdAndServiceDateBetween(Long restaurantId, Long userId, LocalDate startDate, LocalDate endDate);

    @Modifying
    void deleteByRestaurant_Id(Long restaurantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT a
            FROM StaffShiftAssignment a
            JOIN FETCH a.shift
            WHERE a.restaurant.id = :restaurantId
              AND a.user.id = :userId
              AND a.serviceDate >= :startDate
            ORDER BY a.serviceDate, a.plannedStartLocalTime
            """)
    List<StaffShiftAssignment> findFutureAssignmentsForUpdate(Long restaurantId, Long userId, LocalDate startDate);

    @Modifying
    @Query("""
            DELETE FROM StaffShiftAssignment a
            WHERE a.restaurant.id = :restaurantId
              AND a.user.id = :userId
              AND a.serviceDate >= :startDate
            """)
    int deleteFutureAssignments(Long restaurantId, Long userId, LocalDate startDate);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(value = """
            SELECT a.*
            FROM staff_shift_assignment a
            WHERE a.user_id = :userId
              AND a.restaurant_id <> :restaurantId
              AND tstzrange(
                    (a.service_date::timestamp + a.planned_start_local_time),
                    (
                      a.service_date::timestamp
                      + a.planned_end_local_time
                      + CASE
                          WHEN a.planned_end_local_time <= a.planned_start_local_time THEN interval '1 day'
                          ELSE interval '0 day'
                        END
                    ),
                    '[)'
                  ) && tstzrange(:startUtc::timestamp, :endUtc::timestamp, '[)')
            LIMIT 1
            FOR UPDATE
            """, nativeQuery = true)
    List<StaffShiftAssignment> findCrossRestaurantOverlapsForUpdate(Long userId, Long restaurantId, Instant startUtc, Instant endUtc);
}
