package com.mesaro.openinghours;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OpeningHoursRepository extends JpaRepository<OpeningHours, OpeningHoursId> {

    List<OpeningHours> findByRestaurant_IdOrderByIdDayOfWeekAsc(Long restaurantId);

    Optional<OpeningHours> findByRestaurant_IdAndIdDayOfWeek(Long restaurantId, Integer dayOfWeek);
}
