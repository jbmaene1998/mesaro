package com.mesaro.table;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {

    List<DiningTable> findByRestaurantIdOrderByLabel(Long restaurantId);

    @Query("SELECT t FROM DiningTable t JOIN FETCH t.restaurant r " +
            "WHERE r.id = :restaurantId ORDER BY t.label")
    List<DiningTable> findByRestaurantIdWithRestaurant(Long restaurantId);

    List<DiningTable> findByRestaurantIdAndStatus(Long restaurantId, TableStatus status);

    Optional<DiningTable> findByRestaurantIdAndLabel(Long restaurantId, String label);

    boolean existsByRestaurantIdAndLabel(Long restaurantId, String label);

    @Query("SELECT t FROM DiningTable t JOIN FETCH t.restaurant WHERE t.id = :id")
    Optional<DiningTable> findByIdWithRestaurant(Long id);

    @Query("SELECT t FROM DiningTable t WHERE t.restaurant.id = :restaurantId AND t.seats >= :minSeats ORDER BY t.seats")
    List<DiningTable> findByRestaurantIdAndMinSeats(Long restaurantId, int minSeats);

    @Query("SELECT t FROM DiningTable t WHERE t.restaurant.id = :restaurantId AND t.status = 'AVAILABLE' AND t.seats >= :partySize ORDER BY t.seats")
    List<DiningTable> findAvailableTablesForPartySize(Long restaurantId, int partySize);

    @Modifying
    long deleteByRestaurant_Id(Long restaurantId);
}
