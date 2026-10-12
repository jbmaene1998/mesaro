package com.mesaro.availability;

import java.time.Instant;
import java.time.LocalTime;

/**
 * Result of DST validation for a local time.
 */
public sealed interface DstResult {

    /**
     * Time is valid and unambiguous.
     */
    record Valid(LocalTime localTime, Instant utcInstant) implements DstResult {}

    /**
     * Time does not exist due to DST gap (spring forward).
     */
    record Gap(LocalTime localTime) implements DstResult {}

    /**
     * Time is ambiguous due to DST overlap (fall back).
     * We use the earlier offset by convention.
     */
    record Overlap(LocalTime localTime, Instant utcInstant, String note) implements DstResult {}
}
