package com.mesaro.availability;

import com.mesaro.table.DiningTable;
import com.mesaro.table.TableCombination;

import java.util.List;
import java.util.Set;

/**
 * Result of table selection algorithm.
 */
public sealed interface TableSelectionResult {

    /**
     * A single table was selected.
     */
    record SingleTable(DiningTable table, int waste) implements TableSelectionResult {
        public List<Long> getTableIds() {
            return List.of(table.getId());
        }
    }

    /**
     * A combination of tables was selected.
     */
    record Combination(TableCombination combination, int waste) implements TableSelectionResult {
        public List<Long> getTableIds() {
            return combination.getTables().stream()
                    .map(DiningTable::getId)
                    .sorted()
                    .toList();
        }
    }

    /**
     * No suitable table or combination found.
     */
    record NoMatch(String reason) implements TableSelectionResult {}

    default boolean isMatch() {
        return this instanceof SingleTable || this instanceof Combination;
    }

    default int getTotalSeats() {
        return switch (this) {
            case SingleTable s -> s.table().getSeats();
            case Combination c -> c.combination().getTotalSeats();
            case NoMatch n -> 0;
        };
    }
}
