package com.mesaro.dashboard;

import com.mesaro.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api")
@Tag(name = "Dashboard", description = "Dashboard timeline and statistics endpoints")
@Validated
public class DashboardStatsController {

    private final DashboardService dashboardService;

    public DashboardStatsController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats/daily")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Get daily stats", description = "Get daily statistics for a date")
    public ApiResponse<DailyStats> getDailyStats(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Date (defaults to today)") @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        DailyStats stats = date != null
                ? dashboardService.getDailyStats(restaurantId, date)
                : dashboardService.getDailyStats(restaurantId);
        return ApiResponse.success(stats);
    }

    @GetMapping("/stats/weekly")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Get weekly stats", description = "Get weekly statistics for a date")
    public ApiResponse<WeeklyStatsResponse> getWeeklyStats(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Date (defaults to today)") @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        WeeklyStatsResponse response = dashboardService.getWeeklyStats(restaurantId, date);
        return ApiResponse.success(response);
    }

    @GetMapping("/stats/monthly")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Get monthly stats", description = "Get monthly statistics for a date")
    public ApiResponse<MonthlyStatsResponse> getMonthlyStats(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Date (defaults to today)") @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        MonthlyStatsResponse response = dashboardService.getMonthlyStats(restaurantId, date);
        return ApiResponse.success(response);
    }

    @GetMapping("/timeline")
    @PreAuthorize("@restaurantAccessGuard.hasAtLeastRole(#restaurantId, 'STAFF')")
    @Operation(summary = "Get timeline", description = "Get timeline view for a date")
    public ApiResponse<TimelineResponse> getTimeline(
            @Parameter(description = "Restaurant ID") @RequestParam @Positive Long restaurantId,
            @Parameter(description = "Date (defaults to today)") @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        TimelineResponse response = dashboardService.getTimeline(restaurantId, date);
        return ApiResponse.success(response);
    }
}
