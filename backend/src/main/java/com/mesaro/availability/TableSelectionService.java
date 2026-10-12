package com.mesaro.availability;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.table.DiningTable;
import com.mesaro.table.DiningTableRepository;
import com.mesaro.table.TableCombination;
import com.mesaro.table.TableCombinationRepository;
import com.mesaro.table.TableStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Table selection algorithm for AUTO assignment mode.
 *
 * Priority order:
 * 1. Exact fit (seats == partySize)
 * 2. Smallest over-capacity (minimize waste)
 * 3. Combinations (when no single table fits)
 *
 * Deterministic: always returns same result for same input.
 */
@Service
@Transactional(readOnly = true)
public class TableSelectionService {

    private static final Logger log = LoggerFactory.getLogger(TableSelectionService.class);

    private final DiningTableRepository tableRepository;
    private final TableCombinationRepository combinationRepository;
    private final OverlapCheckRepository overlapCheckRepository;

    public TableSelectionService(
            DiningTableRepository tableRepository,
            TableCombinationRepository combinationRepository,
            OverlapCheckRepository overlapCheckRepository) {
        this.tableRepository = tableRepository;
        this.combinationRepository = combinationRepository;
        this.overlapCheckRepository = overlapCheckRepository;
    }

    /**
     * Find the best available table or combination for a party.
     *
     * @param restaurant The restaurant
     * @param partySize  Number of guests
     * @param startUtc   Reservation start time in UTC
     * @param endUtc     Reservation end time in UTC
     * @return Selection result (SingleTable, Combination, or NoMatch)
     */
    public TableSelectionResult findBestMatch(Restaurant restaurant, int partySize,
                                               Instant startUtc, Instant endUtc) {
        Long restaurantId = restaurant.getId();

        // Step 1: Try single tables first
        TableSelectionResult singleTableResult = findBestSingleTable(restaurantId, partySize, startUtc, endUtc);
        if (singleTableResult.isMatch()) {
            return singleTableResult;
        }

        // Step 2: Try combinations
        TableSelectionResult combinationResult = findBestCombination(restaurantId, partySize, startUtc, endUtc);
        if (combinationResult.isMatch()) {
            return combinationResult;
        }

        // No match found
        log.debug("No available table for party of {} at restaurant {} from {} to {}",
                partySize, restaurantId, startUtc, endUtc);
        return new TableSelectionResult.NoMatch("No available table for party size " + partySize);
    }

    /**
     * Check if a specific table is available for a time slot.
     */
    public boolean isTableAvailable(Long tableId, Instant startUtc, Instant endUtc) {
        Set<Long> withReservations = overlapCheckRepository.findTablesWithOverlappingReservations(
                List.of(tableId), startUtc, endUtc);
        if (withReservations.contains(tableId)) {
            return false;
        }

        Set<Long> withHolds = overlapCheckRepository.findTablesWithActiveHolds(
                List.of(tableId), startUtc, endUtc);
        return !withHolds.contains(tableId);
    }

    /**
     * Check if all tables in a combination are available.
     */
    public boolean isCombinationAvailable(TableCombination combination, Instant startUtc, Instant endUtc) {
        boolean anyUnavailable = combination.getTables().stream()
                .anyMatch(t -> t.getStatus() != TableStatus.AVAILABLE);
        if (anyUnavailable) {
            return false;
        }

        List<Long> tableIds = combination.getTables().stream()
                .map(DiningTable::getId)
                .toList();

        if (tableIds.isEmpty()) {
            return false;
        }

        Set<Long> withReservations = overlapCheckRepository.findTablesWithOverlappingReservations(
                tableIds, startUtc, endUtc);
        if (!withReservations.isEmpty()) {
            return false;
        }

        Set<Long> withHolds = overlapCheckRepository.findTablesWithActiveHolds(tableIds, startUtc, endUtc);
        return withHolds.isEmpty();
    }

    /**
     * Get all available tables for a time slot.
     */
    public List<DiningTable> getAvailableTables(Long restaurantId, int minSeats,
                                                  Instant startUtc, Instant endUtc) {
        // Get all candidate tables
        List<DiningTable> candidates = tableRepository.findByRestaurantIdAndStatus(
                restaurantId, TableStatus.AVAILABLE);

        // Filter by minimum seats
        candidates = candidates.stream()
                .filter(t -> t.getSeats() >= minSeats)
                .toList();

        if (candidates.isEmpty()) {
            return List.of();
        }

        // Get table IDs
        List<Long> tableIds = candidates.stream()
                .map(DiningTable::getId)
                .toList();

        // Find unavailable tables
        Set<Long> unavailable = getUnavailableTableIds(tableIds, startUtc, endUtc);

        // Filter out unavailable
        return candidates.stream()
                .filter(t -> !unavailable.contains(t.getId()))
                .toList();
    }

    private TableSelectionResult findBestSingleTable(Long restaurantId, int partySize,
                                                       Instant startUtc, Instant endUtc) {
        // Get all available tables that can fit the party
        List<DiningTable> candidates = tableRepository.findByRestaurantIdAndStatus(
                restaurantId, TableStatus.AVAILABLE);

        // Filter by capacity and sort by waste (seats - partySize), then by ID for determinism
        List<DiningTable> sorted = candidates.stream()
                .filter(t -> t.getSeats() >= partySize)
                .sorted(Comparator
                        .comparingInt((DiningTable t) -> t.getSeats() - partySize)
                        .thenComparingLong(DiningTable::getId))
                .toList();

        if (sorted.isEmpty()) {
            return new TableSelectionResult.NoMatch("No table with sufficient capacity");
        }

        // Get all candidate table IDs
        List<Long> tableIds = sorted.stream().map(DiningTable::getId).toList();

        // Find tables with conflicts
        Set<Long> unavailable = getUnavailableTableIds(tableIds, startUtc, endUtc);

        // Find first available table (already sorted by preference)
        for (DiningTable table : sorted) {
            if (!unavailable.contains(table.getId())) {
                int waste = table.getSeats() - partySize;
                log.debug("Selected table {} (seats={}, waste={}) for party of {}",
                        table.getLabel(), table.getSeats(), waste, partySize);
                return new TableSelectionResult.SingleTable(table, waste);
            }
        }

        return new TableSelectionResult.NoMatch("All suitable tables are occupied");
    }

    private TableSelectionResult findBestCombination(Long restaurantId, int partySize,
                                                       Instant startUtc, Instant endUtc) {
        // Get combinations that can accommodate the party
        List<TableCombination> candidates = combinationRepository
                .findByRestaurantIdAndCapacityFitting(restaurantId, partySize);

        if (candidates.isEmpty()) {
            return new TableSelectionResult.NoMatch("No suitable combination defined");
        }

        // Sort by waste (maxCapacity - partySize), then by ID for determinism
        List<TableCombination> sorted = candidates.stream()
                .sorted(Comparator
                        .comparingInt((TableCombination c) -> c.getMaxCapacity() - partySize)
                        .thenComparingLong(TableCombination::getId))
                .toList();

        // Check each combination for availability
        for (TableCombination combination : sorted) {
            if (isCombinationAvailable(combination, startUtc, endUtc)) {
                int waste = combination.getMaxCapacity() - partySize;
                log.debug("Selected combination {} (capacity={}-{}, waste={}) for party of {}",
                        combination.getName(), combination.getMinCapacity(),
                        combination.getMaxCapacity(), waste, partySize);
                return new TableSelectionResult.Combination(combination, waste);
            }
        }

        return new TableSelectionResult.NoMatch("All suitable combinations are occupied");
    }

    private Set<Long> getUnavailableTableIds(List<Long> tableIds, Instant startUtc, Instant endUtc) {
        Set<Long> withReservations = overlapCheckRepository.findTablesWithOverlappingReservations(
                tableIds, startUtc, endUtc);
        Set<Long> withHolds = overlapCheckRepository.findTablesWithActiveHolds(tableIds, startUtc, endUtc);

        // Combine both sets
        Set<Long> unavailable = new java.util.HashSet<>(withReservations);
        unavailable.addAll(withHolds);
        return unavailable;
    }
}
