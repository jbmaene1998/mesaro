package com.mesaro.report;

import com.mesaro.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Reports", description = "Reporting and business intelligence endpoints")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/summary")
    @Operation(summary = "Get BI summary", description = "Get KPI, daily trend, and shift breakdown for a date range")
    public ApiResponse<ReportSummaryResponse> getSummary(
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId,
            @Parameter(description = "Start date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        ReportSummaryResponse response = reportService.getSummary(restaurantId, startDate, endDate);
        return ApiResponse.success(response);
    }

    @GetMapping(value = "/export.csv", produces = "text/csv")
    @Operation(summary = "Export BI report CSV", description = "Export KPI and breakdown data as CSV")
    public ResponseEntity<byte[]> exportCsv(
            @Parameter(description = "Restaurant ID") @RequestParam Long restaurantId,
            @Parameter(description = "Start date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @Parameter(description = "End date") @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        String csv = reportService.exportCsv(restaurantId, startDate, endDate);
        String fileName = String.format("report_%d_%s_%s.csv", restaurantId, startDate, endDate);

        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }
}
