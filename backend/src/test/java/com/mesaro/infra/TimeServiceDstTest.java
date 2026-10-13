package com.mesaro.infra;

import com.mesaro.common.exception.UnprocessableEntityException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TimeServiceDstTest {

    private final TimeService timeService = new TimeService();

    @Test
    void dstGap_throws422() {
        ZoneId zone = ZoneId.of("America/New_York");
        LocalDate gapDate = findGapDate(zone);

        assertThatThrownBy(() -> timeService.toUtcStrict(gapDate, LocalTime.of(2, 30), zone, null))
                .isInstanceOf(UnprocessableEntityException.class);
    }

    @Test
    void dstOverlap_defaultsToEarlierOffsetAndPinsWhenProvided() {
        ZoneId zone = ZoneId.of("America/New_York");
        LocalDate overlapDate = findOverlapDate(zone);
        LocalDateTime ldt = LocalDateTime.of(overlapDate, LocalTime.of(1, 30));
        List<ZoneOffset> offsets = zone.getRules().getValidOffsets(ldt);

        assertThat(offsets).hasSize(2);
        ZoneOffset earlier = offsets.stream().min(ZoneOffset::compareTo).orElseThrow();
        ZoneOffset later = offsets.stream().max(ZoneOffset::compareTo).orElseThrow();

        var defaulted = timeService.toUtcStrict(overlapDate, LocalTime.of(1, 30), zone, null);
        var earlierPinned = timeService.toUtcStrict(
                overlapDate, LocalTime.of(1, 30), zone, earlier.getTotalSeconds() / 60);
        var laterPinned = timeService.toUtcStrict(
                overlapDate, LocalTime.of(1, 30), zone, later.getTotalSeconds() / 60);

        assertThat(defaulted).isEqualTo(earlierPinned);
        assertThat(laterPinned).isNotEqualTo(earlierPinned);
    }

    @Test
    void normalTime_convertsToUtc() {
        ZoneId zone = ZoneId.of("America/New_York");
        var utc = timeService.toUtcStrict(LocalDate.of(2026, 1, 15), LocalTime.of(12, 0), zone, null);
        assertThat(utc).isNotNull();
    }

    private LocalDate findGapDate(ZoneId zone) {
        LocalDate start = LocalDate.now(zone);
        for (int i = 0; i < 730; i++) {
            LocalDate d = start.plusDays(i);
            if (zone.getRules().getValidOffsets(LocalDateTime.of(d, LocalTime.of(2, 30))).isEmpty()) {
                return d;
            }
        }
        throw new IllegalStateException("Could not find DST gap date");
    }

    private LocalDate findOverlapDate(ZoneId zone) {
        LocalDate start = LocalDate.now(zone);
        for (int i = 0; i < 730; i++) {
            LocalDate d = start.plusDays(i);
            if (zone.getRules().getValidOffsets(LocalDateTime.of(d, LocalTime.of(1, 30))).size() > 1) {
                return d;
            }
        }
        throw new IllegalStateException("Could not find DST overlap date");
    }
}
