package com.mesaro.staff;

import com.mesaro.auth.AuthResponse;
import com.mesaro.common.ApiResponse;
import com.mesaro.security.AuthPrincipal;
import com.mesaro.security.RestaurantContext;
import com.mesaro.security.RestaurantContextHolder;
import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserRestaurant;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff")
@Tag(name = "Staff", description = "Staff management endpoints")
@Validated
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping
    @Operation(summary = "List staff", description = "List staff members and active invites")
    public ApiResponse<List<StaffResponse>> listStaff() {
        RestaurantContext context = requireContext();
        requireAtLeast(context.role(), RestaurantRole.STAFF);

        List<StaffResponse> responses = new ArrayList<>();
        List<UserRestaurant> members = staffService.listMembers(context.restaurantId());
        Map<Long, java.time.Instant> lastLoginByUserId = staffService.findLastLoginByUserIds(
                members.stream().map(member -> member.getUser().getId()).toList()
        );
        members.stream()
                .map(member -> StaffResponse.fromMember(member, lastLoginByUserId.get(member.getUser().getId())))
                .forEach(responses::add);

        staffService.listActiveInvites(context.restaurantId()).stream()
                .map(StaffResponse::fromInvite)
                .forEach(responses::add);

        return ApiResponse.success(responses);
    }

    @PostMapping("/invite")
    @Operation(summary = "Invite staff", description = "Invite staff to join a restaurant")
    public ApiResponse<StaffInviteResponse> inviteStaff(@Valid @RequestBody InviteStaffRequest request) {
        RestaurantContext context = requireContext();
        requireAtLeast(context.role(), RestaurantRole.MANAGER);
        requireRoleForTarget(context.role(), request.role());

        AuthPrincipal principal = requirePrincipal();
        StaffService.StaffInviteWithToken inviteWithToken = staffService.createInvite(
                context.restaurantId(),
                request,
                principal.getUserId());

        return ApiResponse.success(StaffInviteResponse.from(inviteWithToken.invite()), "Invite sent");
    }

    @PostMapping("/accept-invite")
    @Operation(summary = "Accept invite", description = "Accept a staff invite using an invite token")
    public ApiResponse<AuthResponse> acceptInvite(@Valid @RequestBody AcceptStaffInviteRequest request) {
        AuthResponse authResponse = staffService.acceptInvite(request.inviteToken(), request.password());
        return ApiResponse.success(authResponse, "Invite accepted");
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get staff member", description = "Get staff member or invite details")
    public ApiResponse<StaffResponse> getStaff(@PathVariable Long id) {
        RestaurantContext context = requireContext();
        requireAtLeast(context.role(), RestaurantRole.STAFF);

        return staffService.findMember(context.restaurantId(), id)
                .map(StaffResponse::fromMember)
                .map(ApiResponse::success)
                .orElseGet(() -> staffService.findInvite(context.restaurantId(), id)
                        .map(StaffResponse::fromInvite)
                        .map(ApiResponse::success)
                        .orElseThrow(() -> new com.mesaro.common.exception.NotFoundException("Staff", id)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update staff", description = "Update staff member or invite role")
    public ApiResponse<StaffResponse> updateStaff(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStaffRequest request) {
        RestaurantContext context = requireContext();
        requireAtLeast(context.role(), RestaurantRole.MANAGER);
        requireRoleForTarget(context.role(), request.role());

        AuthPrincipal principal = requirePrincipal();
        return staffService.findMember(context.restaurantId(), id)
                .map(member -> StaffResponse.fromMember(
                        staffService.updateMemberRole(context.restaurantId(), id, request.role(), principal.getUserId())))
                .map(ApiResponse::success)
                .orElseGet(() -> {
                    StaffInvite invite = staffService.updateInviteRole(context.restaurantId(), id, request.role());
                    return ApiResponse.success(StaffResponse.fromInvite(invite), "Invite updated");
                });
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Remove staff", description = "Remove staff member or revoke invite")
    public ApiResponse<Void> deleteStaff(@PathVariable Long id) {
        RestaurantContext context = requireContext();
        requireAtLeast(context.role(), RestaurantRole.MANAGER);

        AuthPrincipal principal = requirePrincipal();
        return staffService.findMember(context.restaurantId(), id)
                .map(member -> {
                    requireRoleForRemoval(context.role(), member.getRole());
                    staffService.removeMember(context.restaurantId(), id, principal.getUserId());
                    return ApiResponse.<Void>success(null, "Staff removed");
                })
                .orElseGet(() -> {
                    staffService.revokeInvite(context.restaurantId(), id);
                    return ApiResponse.<Void>success(null, "Invite revoked");
                });
    }

    @PostMapping("/{id}/resend-invite")
    @Operation(summary = "Resend invite", description = "Resend staff invite email")
    public ApiResponse<StaffInviteResponse> resendInvite(@PathVariable Long id) {
        RestaurantContext context = requireContext();
        requireAtLeast(context.role(), RestaurantRole.MANAGER);

        StaffService.StaffInviteWithToken inviteWithToken = staffService.resendInvite(context.restaurantId(), id);
        return ApiResponse.success(StaffInviteResponse.from(inviteWithToken.invite()), "Invite resent");
    }

    private RestaurantContext requireContext() {
        return RestaurantContextHolder.require();
    }

    private AuthPrincipal requirePrincipal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthPrincipal principal)) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        return principal;
    }

    private void requireAtLeast(RestaurantRole current, RestaurantRole required) {
        if (current == null || !current.atLeast(required)) {
            throw new AccessDeniedException("Access denied");
        }
    }

    private void requireRoleForTarget(RestaurantRole current, RestaurantRole target) {
        if (target == RestaurantRole.MANAGER && current != RestaurantRole.OWNER) {
            throw new AccessDeniedException("Only owners can grant manager role");
        }
        if (target == RestaurantRole.OWNER) {
            throw new AccessDeniedException("Owner role cannot be assigned");
        }
    }

    private void requireRoleForRemoval(RestaurantRole current, RestaurantRole target) {
        if (target == RestaurantRole.MANAGER && current != RestaurantRole.OWNER) {
            throw new AccessDeniedException("Only owners can remove managers");
        }
    }
}
