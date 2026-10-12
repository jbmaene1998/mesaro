package com.mesaro.dashboard;

public record LiveServiceTableStatus(
        Long tableId,
        String label,
        int seats,
        LiveServiceStatus status,
        LiveServiceReservation activeReservation,
        LiveServiceReservation nextReservation,
        Integer turnMinutes,
        Integer expectedTurnMinutes,
        Integer overstayMinutes
) {
}
