package com.mesaro.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mesaro.staff.AcceptStaffInviteRequest;
import com.mesaro.staff.InviteStaffRequest;
import com.mesaro.staff.StaffInvite;
import com.mesaro.staff.StaffInviteRepository;
import com.mesaro.staff.StaffService;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantRepository;
import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurantRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StaffInviteAcceptanceIntegrationTest extends IntegrationTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StaffService staffService;

    @Autowired
    private RestaurantRepository restaurantRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private UserRestaurantRepository userRestaurantRepository;

    @Autowired
    private StaffInviteRepository staffInviteRepository;
    @Test
    void acceptInvite_createsUserMembership_andIssuesTokens() throws Exception {
        Restaurant restaurant = restaurantRepository.save(new Restaurant("Test", "test", "UTC"));
        UserAccount actor = userAccountRepository.save(new UserAccount("owner@example.com", "hash"));

        InviteStaffRequest inviteRequest = new InviteStaffRequest("newstaff@example.com", "New", "Staff", RestaurantRole.STAFF);
        StaffService.StaffInviteWithToken inviteWithToken = staffService.createInvite(
                restaurant.getId(),
                inviteRequest,
                actor.getId()
        );

        AcceptStaffInviteRequest acceptRequest = new AcceptStaffInviteRequest(inviteWithToken.token(), "password123");
        MvcResult result = mockMvc.perform(post("/api/staff/accept-invite")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(acceptRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertNotNull(response.path("data").path("accessToken").asText());

        Optional<UserAccount> invitee = userAccountRepository.findByEmailIgnoreCase("newstaff@example.com");
        assertTrue(invitee.isPresent());
        assertTrue(userRestaurantRepository.existsByUser_IdAndRestaurant_Id(
                invitee.get().getId(), restaurant.getId()));

        StaffInvite invite = staffInviteRepository.findById(inviteWithToken.invite().getId()).orElseThrow();
        assertNotNull(invite.getAcceptedAtUtc());
    }
}
