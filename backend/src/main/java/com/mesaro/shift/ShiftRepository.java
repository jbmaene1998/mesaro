package com.mesaro.shift;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {

    List<Shift> findByRestaurantIdOrderByDayOfWeekAscStartTimeAsc(Long restaurantId);

    @Query("SELECT s FROM Shift s JOIN FETCH s.restaurant r " +
            "WHERE r.id = :restaurantId ORDER BY s.dayOfWeek ASC, s.startTime ASC")
    List<Shift> findByRestaurantIdWithRestaurant(Long restaurantId);

    List<Shift> findByRestaurantIdAndDayOfWeekOrderByStartTime(Long restaurantId, int dayOfWeek);

    List<Shift> findByRestaurantIdAndDayOfWeekAndStatus(Long restaurantId, int dayOfWeek, ShiftStatus status);

    @Query("SELECT s FROM Shift s WHERE s.restaurant.id = :restaurantId " +
            "AND s.dayOfWeek = :dayOfWeek " +
            "AND s.startTime < :endTime AND s.endTime > :startTime " +
            "AND (:excludeId IS NULL OR s.id != :excludeId)")
    List<Shift> findOverlappingShifts(Long restaurantId, int dayOfWeek,
                                       LocalTime startTime, LocalTime endTime, Long excludeId);

    @Query("SELECT s FROM Shift s WHERE s.restaurant.id = :restaurantId " +
            "AND s.dayOfWeek = :dayOfWeek " +
            "AND s.status = 'ACTIVE' " +
            "AND s.startTime <= :time AND s.endTime > :time")
    List<Shift> findActiveShiftAtTime(Long restaurantId, int dayOfWeek, LocalTime time);

    @Query("SELECT s FROM Shift s WHERE s.restaurant.id = :restaurantId " +
            "AND s.status = 'ACTIVE' " +
            "AND ((" +
            "s.dayOfWeek = :dayOfWeek AND ((" +
            "s.startTime < s.endTime AND s.startTime <= :time AND s.endTime > :time" +
            ") OR (" +
            "s.startTime > s.endTime AND s.startTime <= :time" +
            "))) OR (" +
            "s.dayOfWeek = :previousDayOfWeek AND s.startTime > s.endTime AND s.endTime > :time" +
            "))")
    List<Shift> findActiveShiftAtTimeIncludingOvernight(
            Long restaurantId,
            int dayOfWeek,
            int previousDayOfWeek,
            LocalTime time
    );

    @Query("SELECT s FROM Shift s JOIN FETCH s.restaurant WHERE s.id = :id")
    Optional<Shift> findByIdWithRestaurant(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Shift s WHERE s.id = :id")
    Optional<Shift> findByIdForUpdate(Long id);

    boolean existsByRestaurantIdAndNameAndDayOfWeek(Long restaurantId, String name, int dayOfWeek);

    boolean existsByRestaurantIdAndStatus(Long restaurantId, ShiftStatus status);

    @Modifying
    long deleteByRestaurant_Id(Long restaurantId);
}
