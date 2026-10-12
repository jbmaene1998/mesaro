package com.mesaro.security;

import java.util.List;

public interface RestaurantAccessPrincipal {
    List<RestaurantRoleAssignment> getRestaurantRoles();
}
