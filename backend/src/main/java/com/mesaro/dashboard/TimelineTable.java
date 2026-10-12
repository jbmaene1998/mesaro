package com.mesaro.dashboard;

import com.mesaro.table.DiningTable;
import com.mesaro.table.TableStatus;

public record TimelineTable(
        Long id,
        String label,
        int seats,
        TableStatus status
) {
    public static TimelineTable from(DiningTable table) {
        return new TimelineTable(
                table.getId(),
                table.getLabel(),
                table.getSeats(),
                table.getStatus()
        );
    }
}
