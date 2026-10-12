package com.mesaro.user;

import com.mesaro.restaurant.Restaurant;
import com.mesaro.security.RestaurantRole;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_restaurant")
public class UserRestaurant {

    @EmbeddedId
    private UserRestaurantId id;

    @MapsId("userId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @MapsId("restaurantId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "restaurant_id", nullable = false)
    private Restaurant restaurant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RestaurantRole role;

    protected UserRestaurant() {
    }

    public UserRestaurant(UserAccount user, Restaurant restaurant, RestaurantRole role) {
        this.user = user;
        this.restaurant = restaurant;
        this.role = role;
        this.id = new UserRestaurantId(user.getId(), restaurant.getId());
    }

    public UserRestaurantId getId() {
        return id;
    }

    public UserAccount getUser() {
        return user;
    }

    public Restaurant getRestaurant() {
        return restaurant;
    }

    public RestaurantRole getRole() {
        return role;
    }

    public void setRole(RestaurantRole role) {
        this.role = role;
    }
}
