package com.mesaro.table;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

/**
 * Rules for joining tables into combinations across floor areas.
 * Same normalized area always combines; different areas require at least one
 * member of each mismatched pair to allow cross-area combine.
 */
public final class TableAreaCompatibility {

    private TableAreaCompatibility() {
    }

    public static String normalizeArea(String area) {
        if (area == null || area.isBlank()) {
            return "";
        }
        return area.trim().toLowerCase(Locale.ROOT);
    }

    public static boolean canCombinePair(DiningTable left, DiningTable right) {
        if (normalizeArea(left.getArea()).equals(normalizeArea(right.getArea()))) {
            return true;
        }
        return left.isAllowCrossAreaCombine() || right.isAllowCrossAreaCombine();
    }

    public static boolean canCombineAll(Collection<DiningTable> tables) {
        List<DiningTable> list = new ArrayList<>(tables);
        for (int i = 0; i < list.size(); i++) {
            for (int j = i + 1; j < list.size(); j++) {
                if (!canCombinePair(list.get(i), list.get(j))) {
                    return false;
                }
            }
        }
        return true;
    }

    public static String describeConflict(Collection<DiningTable> tables) {
        List<DiningTable> list = new ArrayList<>(tables);
        for (int i = 0; i < list.size(); i++) {
            for (int j = i + 1; j < list.size(); j++) {
                DiningTable left = list.get(i);
                DiningTable right = list.get(j);
                if (!canCombinePair(left, right)) {
                    return "Tables '" + left.getLabel() + "' (" + displayArea(left.getArea())
                            + ") and '" + right.getLabel() + "' (" + displayArea(right.getArea())
                            + ") are in different areas. Enable cross-area combine on at least one of them.";
                }
            }
        }
        return "Tables cannot be combined across areas";
    }

    private static String displayArea(String area) {
        if (area == null || area.isBlank()) {
            return "unassigned";
        }
        return area.trim();
    }
}
