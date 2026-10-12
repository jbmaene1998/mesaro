package com.mesaro.availability;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.table.DiningTable;
import com.mesaro.table.DiningTableRepository;
import com.mesaro.table.TableCombination;
import com.mesaro.table.TableCombinationRepository;
import com.mesaro.table.TableStatus;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TableSelectionServiceTest {

    private final DiningTableRepository tableRepository;
    private final TableCombinationRepository combinationRepository;
    private final OverlapCheckRepository overlapCheckRepository;
    private final TableSelectionService service;

    TableSelectionServiceTest(
            @Mock DiningTableRepository tableRepository,
            @Mock TableCombinationRepository combinationRepository,
            @Mock OverlapCheckRepository overlapCheckRepository) {
        this.tableRepository = tableRepository;
        this.combinationRepository = combinationRepository;
        this.overlapCheckRepository = overlapCheckRepository;
        this.service = new TableSelectionService(tableRepository, combinationRepository, overlapCheckRepository);
    }

    @Test
    void findBestMatch_exactFitSingleTable_returnsSingleTable() {
        Restaurant restaurant = restaurantWithId(1L);
        DiningTable exact = tableWithId(2L, restaurant, "T2", 4);
        DiningTable larger = tableWithId(1L, restaurant, "T1", 6);
        Instant start = Instant.parse("2025-01-01T12:00:00Z");
        Instant end = Instant.parse("2025-01-01T13:00:00Z");

        when(tableRepository.findByRestaurantIdAndStatus(1L, TableStatus.AVAILABLE))
                .thenReturn(List.of(exact, larger));
        when(overlapCheckRepository.findTablesWithOverlappingReservations(anyList(), eq(start), eq(end)))
                .thenReturn(Set.of());
        when(overlapCheckRepository.findTablesWithActiveHolds(anyList(), eq(start), eq(end)))
                .thenReturn(Set.of());

        TableSelectionResult result = service.findBestMatch(restaurant, 4, start, end);

        assertThat(result).isInstanceOf(TableSelectionResult.SingleTable.class);
        TableSelectionResult.SingleTable selected = (TableSelectionResult.SingleTable) result;
        assertThat(selected.table().getId()).isEqualTo(2L);
        assertThat(selected.waste()).isZero();
        verify(combinationRepository, never()).findByRestaurantIdAndCapacityFitting(eq(1L), eq(4));
    }

    @Test
    void findBestMatch_singleTablesUnavailable_fallsBackToCombination() {
        Restaurant restaurant = restaurantWithId(10L);
        DiningTable table = tableWithId(5L, restaurant, "T5", 4);
        TableCombination combo = combinationWithId(3L, restaurant, "Combo", 4, 6, List.of(table));
        Instant start = Instant.parse("2025-01-01T12:00:00Z");
        Instant end = Instant.parse("2025-01-01T13:00:00Z");

        when(tableRepository.findByRestaurantIdAndStatus(10L, TableStatus.AVAILABLE))
                .thenReturn(List.of(table));
        when(combinationRepository.findByRestaurantIdAndCapacityFitting(10L, 4))
                .thenReturn(List.of(combo));
        when(overlapCheckRepository.findTablesWithOverlappingReservations(List.of(5L), start, end))
                .thenReturn(Set.of(5L), Set.of());
        when(overlapCheckRepository.findTablesWithActiveHolds(List.of(5L), start, end))
                .thenReturn(Set.of(), Set.of());

        TableSelectionResult result = service.findBestMatch(restaurant, 4, start, end);

        assertThat(result).isInstanceOf(TableSelectionResult.Combination.class);
        TableSelectionResult.Combination selected = (TableSelectionResult.Combination) result;
        assertThat(selected.combination().getId()).isEqualTo(3L);
        assertThat(selected.waste()).isEqualTo(2);
    }

    @Test
    void findBestMatch_noSingleAndNoCombination_returnsNoMatch() {
        Restaurant restaurant = restaurantWithId(7L);
        DiningTable small = tableWithId(1L, restaurant, "T1", 2);
        DiningTable small2 = tableWithId(2L, restaurant, "T2", 3);
        Instant start = Instant.parse("2025-01-01T12:00:00Z");
        Instant end = Instant.parse("2025-01-01T13:00:00Z");

        when(tableRepository.findByRestaurantIdAndStatus(7L, TableStatus.AVAILABLE))
                .thenReturn(List.of(small, small2));
        when(combinationRepository.findByRestaurantIdAndCapacityFitting(7L, 4))
                .thenReturn(List.of());

        TableSelectionResult result = service.findBestMatch(restaurant, 4, start, end);

        assertThat(result).isInstanceOf(TableSelectionResult.NoMatch.class);
        TableSelectionResult.NoMatch noMatch = (TableSelectionResult.NoMatch) result;
        assertThat(noMatch.reason()).isEqualTo("No available table for party size 4");
    }

    @Test
    void isTableAvailable_whenReservationOverlap_returnsFalseAndSkipsHoldsCheck() {
        Instant start = Instant.parse("2025-01-01T12:00:00Z");
        Instant end = Instant.parse("2025-01-01T13:00:00Z");

        when(overlapCheckRepository.findTablesWithOverlappingReservations(List.of(9L), start, end))
                .thenReturn(Set.of(9L));

        boolean available = service.isTableAvailable(9L, start, end);

        assertThat(available).isFalse();
        verify(overlapCheckRepository, never()).findTablesWithActiveHolds(anyList(), eq(start), eq(end));
    }

    @Test
    void isTableAvailable_whenHoldOverlap_returnsFalse() {
        Instant start = Instant.parse("2025-01-01T12:00:00Z");
        Instant end = Instant.parse("2025-01-01T13:00:00Z");

        when(overlapCheckRepository.findTablesWithOverlappingReservations(List.of(9L), start, end))
                .thenReturn(Set.of());
        when(overlapCheckRepository.findTablesWithActiveHolds(List.of(9L), start, end))
                .thenReturn(Set.of(9L));

        boolean available = service.isTableAvailable(9L, start, end);

        assertThat(available).isFalse();
    }

    @Test
    void isCombinationAvailable_whenEmpty_returnsFalseWithoutChecks() {
        Restaurant restaurant = restaurantWithId(2L);
        TableCombination combo = combinationWithId(1L, restaurant, "Empty", 2, 4, List.of());
        Instant start = Instant.parse("2025-01-01T12:00:00Z");
        Instant end = Instant.parse("2025-01-01T13:00:00Z");

        boolean available = service.isCombinationAvailable(combo, start, end);

        assertThat(available).isFalse();
        verifyNoInteractions(overlapCheckRepository);
    }

    @Test
    void getAvailableTables_filtersByMinSeatsAndAvailability() {
        Restaurant restaurant = restaurantWithId(3L);
        DiningTable t1 = tableWithId(1L, restaurant, "T1", 2);
        DiningTable t2 = tableWithId(2L, restaurant, "T2", 4);
        DiningTable t3 = tableWithId(3L, restaurant, "T3", 6);
        Instant start = Instant.parse("2025-01-01T12:00:00Z");
        Instant end = Instant.parse("2025-01-01T13:00:00Z");

        when(tableRepository.findByRestaurantIdAndStatus(3L, TableStatus.AVAILABLE))
                .thenReturn(List.of(t1, t2, t3));
        when(overlapCheckRepository.findTablesWithOverlappingReservations(List.of(2L, 3L), start, end))
                .thenReturn(Set.of());
        when(overlapCheckRepository.findTablesWithActiveHolds(List.of(2L, 3L), start, end))
                .thenReturn(Set.of(2L));

        List<DiningTable> available = service.getAvailableTables(3L, 4, start, end);

        assertThat(available).extracting(DiningTable::getId).containsExactly(3L);
    }

    @Test
    void getAvailableTables_noCandidates_returnsEmptyAndSkipsOverlapChecks() {
        Instant start = Instant.parse("2025-01-01T12:00:00Z");
        Instant end = Instant.parse("2025-01-01T13:00:00Z");

        when(tableRepository.findByRestaurantIdAndStatus(3L, TableStatus.AVAILABLE))
                .thenReturn(List.of());

        List<DiningTable> available = service.getAvailableTables(3L, 4, start, end);

        assertThat(available).isEmpty();
        verifyNoInteractions(overlapCheckRepository);
    }

    private static Restaurant restaurantWithId(Long id) {
        Restaurant restaurant = new Restaurant("Demo", "demo", "UTC");
        setId(restaurant, id);
        return restaurant;
    }

    private static DiningTable tableWithId(Long id, Restaurant restaurant, String label, int seats) {
        DiningTable table = new DiningTable(restaurant, label, seats);
        table.setStatus(TableStatus.AVAILABLE);
        setId(table, id);
        return table;
    }

    private static TableCombination combinationWithId(Long id, Restaurant restaurant, String name,
                                                      int min, int max, List<DiningTable> tables) {
        TableCombination combination = new TableCombination(restaurant, name, min, max);
        for (DiningTable table : tables) {
            combination.addTable(table);
        }
        setId(combination, id);
        return combination;
    }

    private static void setId(Object target, Long id) {
        try {
            Field field = target.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(target, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Failed to set id via reflection", e);
        }
    }
}
