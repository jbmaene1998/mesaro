package com.mesaro.table;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for acquiring pessimistic locks on dining tables.
 * Used during hold creation to prevent race conditions.
 */
@Repository
public interface DiningTableLockRepository extends JpaRepository<DiningTable, Long> {

    /**
     * Lock tables by IDs in a deterministic order.
     * CRITICAL: Always pass sorted IDs to prevent deadlocks.
     *
     * @param tableIds Table IDs (must be sorted ascending)
     * @return Locked tables
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM DiningTable t WHERE t.id IN :tableIds ORDER BY t.id")
    List<DiningTable> findByIdsForUpdate(List<Long> tableIds);

    /**
     * Lock a single table by ID.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM DiningTable t WHERE t.id = :tableId")
    DiningTable findByIdForUpdate(Long tableId);
}
