package com.mesaro.table;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.hold.HoldRepository;
import com.mesaro.infra.TimeService;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class DiningTableService {

    private static final Logger log = LoggerFactory.getLogger(DiningTableService.class);

    private final DiningTableRepository tableRepository;
    private final TableCombinationRepository combinationRepository;
    private final HoldRepository holdRepository;
    private final ReservationRepository reservationRepository;
    private final RestaurantService restaurantService;
    private final TimeService timeService;
    private final AuditService auditService;

    public DiningTableService(
            DiningTableRepository tableRepository,
            TableCombinationRepository combinationRepository,
            HoldRepository holdRepository,
            ReservationRepository reservationRepository,
            RestaurantService restaurantService,
            TimeService timeService,
            AuditService auditService) {
        this.tableRepository = tableRepository;
        this.combinationRepository = combinationRepository;
        this.holdRepository = holdRepository;
        this.reservationRepository = reservationRepository;
        this.restaurantService = restaurantService;
        this.timeService = timeService;
        this.auditService = auditService;
    }

    public DiningTable findById(Long id) {
        return tableRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("DiningTable", id));
    }

    public DiningTable findByIdWithRestaurant(Long id) {
        return tableRepository.findByIdWithRestaurant(id)
                .orElseThrow(() -> new NotFoundException("DiningTable", id));
    }

    public DiningTable findByIdAndRestaurant(Long id, Long restaurantId) {
        DiningTable table = findById(id);
        if (!table.getRestaurant().getId().equals(restaurantId)) {
            throw new NotFoundException("DiningTable", id);
        }
        restaurantService.findOperationalById(restaurantId);
        return table;
    }

    public List<DiningTable> findByRestaurant(Long restaurantId) {
        restaurantService.findOperationalById(restaurantId);
        return tableRepository.findByRestaurantIdWithRestaurant(restaurantId);
    }

    public List<DiningTable> findAvailableByRestaurant(Long restaurantId) {
        restaurantService.findOperationalById(restaurantId);
        return tableRepository.findByRestaurantIdAndStatus(restaurantId, TableStatus.AVAILABLE);
    }

    @Transactional
    public DiningTable create(Long restaurantId, CreateTableRequest request) {
        Restaurant restaurant = restaurantService.findOperationalById(restaurantId);
        validateLabelUnique(restaurantId, request.label(), null);

        DiningTable table = new DiningTable(restaurant, request.label(), request.seats());
        if (request.area() != null) {
            table.setArea(request.area());
        }
        if (request.allowCrossAreaCombine() != null) {
            table.setAllowCrossAreaCombine(request.allowCrossAreaCombine());
        }
        DiningTable saved = tableRepository.save(table);
        log.info("Created table '{}' for restaurant {}", saved.getLabel(), restaurantId);
        auditService.record(
                AuditEventType.TABLE_CREATED,
                restaurantId,
                null,
                saved.getId(),
                "TABLE",
                Map.of("label", saved.getLabel(), "seats", saved.getSeats())
        );
        return saved;
    }

    @Transactional
    public DiningTable update(Long restaurantId, Long tableId, UpdateTableRequest request) {
        DiningTable table = findByIdAndRestaurant(tableId, restaurantId);

        if (request.label() != null && !request.label().isBlank()) {
            validateLabelUnique(restaurantId, request.label(), tableId);
            table.setLabel(request.label());
        }

        int previousSeats = table.getSeats();
        if (request.seats() != null) {
            table.setSeats(request.seats());
        }

        if (request.area() != null) {
            table.setArea(request.area());
        }

        if (request.allowCrossAreaCombine() != null) {
            table.setAllowCrossAreaCombine(request.allowCrossAreaCombine());
        }

        if (request.status() != null) {
            if (request.status() == TableStatus.UNAVAILABLE && table.getStatus() == TableStatus.AVAILABLE) {
                int deletedHolds = holdRepository.deleteActiveHoldsForTable(tableId, timeService.now());
                if (deletedHolds > 0) {
                    log.info("Released {} active hold(s) for table {} set to UNAVAILABLE", deletedHolds, tableId);
                }
                long upcomingReservations = reservationRepository
                        .countUpcomingActiveReservationsForTable(tableId, timeService.now());
                table.setUpcomingActiveHolds(0L);
                table.setUpcomingActiveReservations(upcomingReservations);
                if (upcomingReservations > 0) {
                    log.warn("Table {} set to UNAVAILABLE with {} upcoming active reservation(s) - manual review required",
                            tableId, upcomingReservations);
                }
            }
            table.setStatus(request.status());
        }

        DiningTable saved = tableRepository.save(table);
        if (request.seats() != null && request.seats() != previousSeats) {
            clampCombinationsForTable(saved);
        }
        log.info("Updated table '{}' for restaurant {}", saved.getLabel(), restaurantId);
        auditService.record(
                AuditEventType.TABLE_UPDATED,
                restaurantId,
                null,
                saved.getId(),
                "TABLE",
                Map.of("label", saved.getLabel(), "status", saved.getStatus().name())
        );
        return saved;
    }

    private void clampCombinationsForTable(DiningTable table) {
        List<TableCombination> combinations = combinationRepository.findByTableId(table.getId());
        for (TableCombination combination : combinations) {
            Integer seatsSum = combinationRepository.sumSeatsByComboId(combination.getId());
            int totalSeats = seatsSum != null ? seatsSum : 0;
            if (combination.getMaxCapacity() > totalSeats) {
                combination.setMaxCapacity(totalSeats);
            }
            if (combination.getMinCapacity() > combination.getMaxCapacity()) {
                combination.setMinCapacity(Math.max(1, combination.getMaxCapacity()));
            }
            combinationRepository.save(combination);
            log.info("Clamped combination {} capacities to seats sum {}", combination.getId(), totalSeats);
        }
    }

    @Transactional
    public void delete(Long restaurantId, Long tableId) {
        DiningTable table = findByIdAndRestaurant(tableId, restaurantId);

        List<TableCombination> combinations = combinationRepository.findByTableId(tableId);
        if (!combinations.isEmpty()) {
            String combNames = combinations.stream()
                    .map(TableCombination::getName)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("");
            throw new ConflictException("Cannot delete table: it belongs to combinations: " + combNames);
        }
        if (reservationRepository.existsByTables_Id(tableId)) {
            throw new ConflictException("Cannot delete table: it is linked to reservation history");
        }
        if (holdRepository.existsByTables_Id(tableId)) {
            throw new ConflictException("Cannot delete table: it is linked to hold history");
        }

        String label = table.getLabel();
        tableRepository.delete(table);
        log.info("Deleted table '{}' from restaurant {}", label, restaurantId);
        auditService.record(
                AuditEventType.TABLE_DELETED,
                restaurantId,
                null,
                tableId,
                "TABLE",
                Map.of("label", label)
        );
    }

    private void validateLabelUnique(Long restaurantId, String label, Long excludeTableId) {
        tableRepository.findByRestaurantIdAndLabel(restaurantId, label)
                .ifPresent(existing -> {
                    if (excludeTableId == null || !existing.getId().equals(excludeTableId)) {
                        throw new ValidationException("Table with label '" + label + "' already exists", "label");
                    }
                });
    }
}
