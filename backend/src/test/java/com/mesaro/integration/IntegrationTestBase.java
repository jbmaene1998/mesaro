package com.mesaro.integration;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.security.RestaurantRole;
import com.mesaro.user.UserAccount;
import com.mesaro.user.UserAccountRepository;
import com.mesaro.user.UserRestaurant;
import com.mesaro.user.UserRestaurantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

public abstract class IntegrationTestBase {
    private static final String DEFAULT_URL = "jdbc:postgresql://localhost:55432/mesaro";
    private static final String DEFAULT_USERNAME = "mesaro";
    private static final String DEFAULT_PASSWORD = "mesaro";

    @DynamicPropertySource
    static void registerDataSourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getProperty("mesaro.it.datasource.url", DEFAULT_URL));
        registry.add("spring.datasource.username", () -> System.getProperty("mesaro.it.datasource.username", DEFAULT_USERNAME));
        registry.add("spring.datasource.password", () -> System.getProperty("mesaro.it.datasource.password", DEFAULT_PASSWORD));
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private UserRestaurantRepository userRestaurantRepository;

    @BeforeEach
    void cleanDatabase() {
        new TestDatabaseCleaner(jdbcTemplate).clean();
    }

    /**
     * Guest holds and restaurant writes are billed to the owner. A restaurant
     * saved only for the test still needs a trialing owner or those calls 500.
     */
    protected void attachBillableOwner(Restaurant restaurant) {
        UserAccount owner = userAccountRepository.save(new UserAccount(
                "owner-" + restaurant.getId() + "-" + System.nanoTime() + "@example.com",
                "hash"
        ));
        userRestaurantRepository.save(new UserRestaurant(owner, restaurant, RestaurantRole.OWNER));
    }
}
