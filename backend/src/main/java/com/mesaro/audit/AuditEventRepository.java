package com.mesaro.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEventEntity, Long> {

    List<AuditEventEntity> findByRestaurantIdAndEventTypeInOrderByIdAsc(Long restaurantId, List<String> eventTypes);
}
