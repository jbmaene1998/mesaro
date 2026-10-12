package com.mesaro.table;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TableCombinationRepository extends JpaRepository<TableCombination, Long> {

    List<TableCombination> findByRestaurantIdOrderByName(Long restaurantId);

    @Query("SELECT DISTINCT c FROM TableCombination c " +
            "JOIN FETCH c.restaurant r " +
            "LEFT JOIN FETCH c.tables " +
            "WHERE r.id = :restaurantId ORDER BY c.name")
    List<TableCombination> findByRestaurantIdWithTables(Long restaurantId);

    Optional<TableCombination> findByRestaurantIdAndName(Long restaurantId, String name);

    boolean existsByRestaurantIdAndName(Long restaurantId, String name);

    @Query("SELECT c FROM TableCombination c WHERE c.restaurant.id = :restaurantId " +
            "AND c.minCapacity <= :partySize AND c.maxCapacity >= :partySize " +
            "ORDER BY (c.maxCapacity - :partySize)")
    List<TableCombination> findByRestaurantIdAndCapacityFitting(Long restaurantId, int partySize);

    @Query("SELECT c FROM TableCombination c JOIN c.tables t WHERE t.id = :tableId")
    List<TableCombination> findByTableId(Long tableId);

    @Query("SELECT c FROM TableCombination c " +
            "LEFT JOIN FETCH c.tables " +
            "JOIN FETCH c.restaurant " +
            "WHERE c.id = :id")
    Optional<TableCombination> findByIdWithRestaurantAndTables(Long id);

    @Query("SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END " +
            "FROM TableCombination c JOIN c.tables t " +
            "WHERE c.id != :combinationId AND c.restaurant.id = :restaurantId AND t.id IN :tableIds")
    boolean existsOtherCombinationWithTables(Long combinationId, Long restaurantId, List<Long> tableIds);

    @Modifying
    long deleteByRestaurant_Id(Long restaurantId);

    @Query("SELECT COALESCE(SUM(dt.seats), 0) FROM TableCombination tc JOIN tc.tables dt WHERE tc.id = :comboId")
    Integer sumSeatsByComboId(Long comboId);
}
