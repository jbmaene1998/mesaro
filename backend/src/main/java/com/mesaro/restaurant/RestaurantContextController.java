package com.mesaro.restaurant;

import com.mesaro.auth.JwtService;
import com.mesaro.common.ApiResponse;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantContext;
import com.mesaro.security.RestaurantContextHolder;
import com.mesaro.security.RestaurantRole;
import com.mesaro.security.RestaurantRoleAssignment;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Restaurant Context", description = "Current restaurant context endpoints")
@Validated
public class RestaurantContextController {

    private final JwtService jwtService;
    private final UserAccountRepository userAccountRepository;

    public RestaurantContextController(JwtService jwtService, UserAccountRepository userAccountRepository) {
        this.jwtService = jwtService;
        this.userAccountRepository = userAccountRepository;
    }

    @PostMapping("/restaurants/{id}/select")
    @Operation(summary = "Select restaurant", description = "Select current restaurant context")
    public ApiResponse<SelectedRestaurantResponse> selectRestaurant(
            @Parameter(description = "Restaurant ID") @PathVariable Long id) {

        AuthPrincipal principal = getPrincipal();
        RestaurantRole role = resolveRole(principal, id);
        if (role == null) {
            throw new AccessDeniedException("No access to restaurant");
        }

        String accessToken = jwtService.generateAccessToken(
                principal.getUserId(),
                principal.getEmail(),
                principal.getRestaurants(),
                resolveMaxRestaurants(principal.getUserId())
        );

        SelectedRestaurantResponse response = new SelectedRestaurantResponse(
                accessToken,
                jwtService.getAccessTokenTtlSeconds(),
                id,
                role
        );

        return ApiResponse.success(response, "Restaurant selected");
    }

    @GetMapping("/context")
    @Operation(summary = "Get context", description = "Get current user and restaurant context")
    public ApiResponse<RestaurantContextResponse> getContext() {
        AuthPrincipal principal = getPrincipal();
        RestaurantContext context = RestaurantContextHolder.require();

        RestaurantRole role = context.role();
        if (role == null) {
            throw new ValidationException("Restaurant context is required", "restaurantId");
        }

        RestaurantContextResponse response = new RestaurantContextResponse(
                principal.getUserId(),
                principal.getEmail(),
                context.restaurantId(),
                role
        );
        return ApiResponse.success(response);
    }

    private AuthPrincipal getPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return principal;
    }

    private RestaurantRole resolveRole(AuthPrincipal principal, Long restaurantId) {
        List<RestaurantRoleAssignment> assignments = principal.getRestaurantRoles();
        for (RestaurantRoleAssignment assignment : assignments) {
            if (restaurantId.equals(assignment.restaurantId())) {
                return assignment.role();
            }
        }
        return null;
    }

    private int resolveMaxRestaurants(Long userId) {
        return userAccountRepository.findById(userId)
                .map(UserAccount::getMaxRestaurants)
                .orElse(1);
    }
}
