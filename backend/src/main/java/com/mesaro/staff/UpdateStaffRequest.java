package com.mesaro.staff;

import com.mesaro.security.RestaurantRole;
import jakarta.validation.constraints.NotNull;

public record UpdateStaffRequest(
        @NotNull(message = "Role is required")
        RestaurantRole role
) {
}
