package com.mesaro.vacation;

import java.time.Instant;
import java.time.LocalDate;

public record VacationResponse(
        Long id,
        Long restaurantId,
        Long userId,
        String requesterName,
        String requesterEmail,
        VacationType type,
        String reason,
        LocalDate startDate,
        LocalDate endDate,
        String notes,
        VacationStatus status,
        Integer affectedReservations,
        Long approvedBy,
        String approvedByName,
        Instant approvedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static VacationResponse from(
            Vacation vacation,
            String requesterName,
            String requesterEmail,
            String approvedByName
    ) {
        return new VacationResponse(
                vacation.getId(),
                vacation.getRestaurant().getId(),
                vacation.getUserId(),
                requesterName,
                requesterEmail,
                vacation.getType(),
                vacation.getReason(),
                vacation.getStartDate(),
                vacation.getEndDate(),
                vacation.getNotes(),
                vacation.getStatus(),
                vacation.getAffectedReservations(),
                vacation.getApprovedBy(),
                approvedByName,
                vacation.getApprovedAt(),
                vacation.getCreatedAt(),
                vacation.getUpdatedAt()
        );
    }
}
