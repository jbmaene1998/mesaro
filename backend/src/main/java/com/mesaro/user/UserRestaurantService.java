package com.mesaro.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserRestaurantService {

    private final UserRestaurantRepository userRestaurantRepository;

    public UserRestaurantService(UserRestaurantRepository userRestaurantRepository) {
        this.userRestaurantRepository = userRestaurantRepository;
    }

    public List<UserRestaurant> listRolesForRestaurant(Long restaurantId) {
        return userRestaurantRepository.findByRestaurant_IdOrderByUser_Id(restaurantId);
    }
}
