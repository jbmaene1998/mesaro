package com.mesaro.auth;

import com.mesaro.common.ApiResponse;
import com.mesaro.security.AuthPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Authentication and token management")
@Validated
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Authenticate with email and password")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success(authService.login(request));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register", description = "Create owner account and return auth tokens")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success(authService.register(request), "Account created");
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh", description = "Issue a new access token using a refresh token")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.success(authService.refresh(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout", description = "Revoke refresh token")
    public ApiResponse<Void> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request);
        return ApiResponse.success(null, "Logged out");
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Forgot password", description = "Request a password reset email")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.success(null, "If an account exists, a reset link has been sent");
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password", description = "Reset password using a reset token")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.success(null, "Password has been reset");
    }

    @GetMapping("/current-user")
    @Operation(summary = "Current user", description = "Get the current authenticated user")
    public ApiResponse<CurrentUserResponse> currentUser() {
        AuthPrincipal principal = getPrincipal();
        CurrentUserResponse response = authService.getCurrentUser(principal.getUserId());
        return ApiResponse.success(response);
    }

    @PutMapping("/current-user")
    @Operation(summary = "Update current user", description = "Update the current authenticated user's profile")
    public ApiResponse<CurrentUserResponse> updateCurrentUser(@Valid @RequestBody UpdateCurrentUserRequest request) {
        AuthPrincipal principal = getPrincipal();
        CurrentUserResponse response = authService.updateCurrentUser(principal.getUserId(), request);
        return ApiResponse.success(response, "User profile updated");
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change password", description = "Change password for current authenticated user")
    public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        AuthPrincipal principal = getPrincipal();
        authService.changePassword(principal.getUserId(), request);
        return ApiResponse.success(null, "Password changed");
    }

    @DeleteMapping("/current-user")
    @Operation(
            summary = "Delete current user",
            description = "Soft-delete the current account after password confirmation. Owned restaurants are marked deleted and purged later by GDPR retention."
    )
    public ApiResponse<Void> deleteCurrentUser(@Valid @RequestBody DeleteCurrentUserRequest request) {
        AuthPrincipal principal = getPrincipal();
        authService.deleteCurrentUser(principal.getUserId(), request);
        return ApiResponse.success(null, "Account deleted");
    }

    private AuthPrincipal getPrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return principal;
    }
}
