package com.mesaro.report;

import java.time.LocalDate;

public record ReportDailyRow(
        LocalDate date,
        int reservations,
        int covers,
        int noShows,
        int cancellations
) {
}
