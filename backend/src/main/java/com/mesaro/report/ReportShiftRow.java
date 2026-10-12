package com.mesaro.report;

public record ReportShiftRow(
        String shiftName,
        int reservations,
        int covers,
        int noShows,
        int cancellations
) {
}
