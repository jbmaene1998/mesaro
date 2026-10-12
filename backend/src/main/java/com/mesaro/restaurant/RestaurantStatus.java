package com.mesaro.restaurant;

public enum RestaurantStatus {
    /** Normal operational state. */
    ACTIVE,

    /** Owner-initiated soft delete. Excluded from all lists and counts. */
    ARCHIVED,

    /** Pending physical deletion by scheduled cleanup job. */
    DELETED
}
