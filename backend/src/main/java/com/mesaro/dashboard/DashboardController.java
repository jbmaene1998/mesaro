package com.mesaro.dashboard;

import com.mesaro.common.ApiResponse;
import com.mesaro.security.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Dashboard data and statistics")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    @Operation(summary = "Get dashboard", description = "Get complete dashboard data for a restaurant")
    public ApiResponse<DashboardResponse> getDashboard(
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId,
            @Parameter(description = "Date (defaults to today)") @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        DashboardResponse response;
        if (date != null) {
            response = dashboardService.getDashboard(restaurantId, date);
        } else {
            response = dashboardService.getDashboard(restaurantId);
        }

        return ApiResponse.success(response);
    }

    @GetMapping("/stats/daily")
    @Operation(summary = "Get daily stats", description = "Get daily statistics for a date")
    public ApiResponse<DailyStats> getDailyStats(
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId,
            @Parameter(description = "Date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        DailyStats stats = dashboardService.getDailyStats(restaurantId, date);

        return ApiResponse.success(stats);
    }

    @GetMapping("/shift/current")
    @Operation(summary = "Get current shift", description = "Get status of the current active shift")
    public ApiResponse<ShiftStatus> getCurrentShift(
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId) {

        ShiftStatus status = dashboardService.getCurrentShiftStatus(restaurantId);

        return ApiResponse.success(status);
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Get upcoming reservations", description = "Get list of upcoming reservations")
    public ApiResponse<List<UpcomingReservation>> getUpcoming(
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId) {

        List<UpcomingReservation> upcoming = dashboardService.getUpcomingReservations(restaurantId);

        return ApiResponse.success(upcoming);
    }

    @GetMapping("/live-service")
    @Operation(summary = "Get live service view", description = "Get real-time service status by table")
    public ApiResponse<LiveServiceViewResponse> getLiveServiceView(
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId) {
        LiveServiceViewResponse response = dashboardService.getLiveServiceView(restaurantId);
        return ApiResponse.success(response);
    }

    @GetMapping("/portfolio")
    @Operation(summary = "Get portfolio dashboard", description = "Get aggregated dashboard data across all restaurants for current user")
    public ApiResponse<PortfolioDashboardResponse> getPortfolioDashboard(
            @Parameter(description = "Date (defaults to each restaurant's today)") @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        AuthPrincipal principal = requirePrincipal();
        PortfolioDashboardResponse response = dashboardService.getPortfolioDashboard(principal.getUserId(), date);
        return ApiResponse.success(response);
    }

    private AuthPrincipal requirePrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return principal;
    }
}
