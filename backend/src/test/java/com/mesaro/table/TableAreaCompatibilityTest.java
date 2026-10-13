package com.mesaro.table;

import com.mesaro.restaurant.Restaurant;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TableAreaCompatibilityTest {

    @Test
    void sameAreaAlwaysCombines() {
        DiningTable hallA = table("T1", "Main hall", false);
        DiningTable hallB = table("T2", "Main hall", false);

        assertTrue(TableAreaCompatibility.canCombineAll(List.of(hallA, hallB)));
    }

    @Test
    void differentAreasBlockedWithoutCrossAreaFlag() {
        DiningTable hall = table("T1", "Main hall", false);
        DiningTable terrace = table("TE1", "Terrace", false);

        assertFalse(TableAreaCompatibility.canCombineAll(List.of(hall, terrace)));
    }

    @Test
    void differentAreasAllowedWhenOneTableAllowsCrossArea() {
        DiningTable hall = table("T1", "Main hall", false);
        DiningTable terrace = table("TE1", "Terrace", true);

        assertTrue(TableAreaCompatibility.canCombineAll(List.of(hall, terrace)));
        assertTrue(TableAreaCompatibility.canCombineAll(List.of(
                table("T1", "Main hall", true),
                table("TE1", "Terrace", false)
        )));
    }

    @Test
    void areaComparisonIsCaseInsensitive() {
        DiningTable a = table("T1", "Main Hall", false);
        DiningTable b = table("T2", "main hall", false);

        assertTrue(TableAreaCompatibility.canCombinePair(a, b));
    }

    private static DiningTable table(String label, String area, boolean allowCrossArea) {
        Restaurant restaurant = new Restaurant("Test", "test", "UTC");
        DiningTable table = new DiningTable(restaurant, label, 2);
        table.setArea(area);
        table.setAllowCrossAreaCombine(allowCrossArea);
        return table;
    }
}
