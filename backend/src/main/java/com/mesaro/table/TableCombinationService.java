package com.mesaro.table;

import com.mesaro.audit.AuditEventType;
import com.mesaro.audit.AuditService;
import com.mesaro.common.exception.ConflictException;
import com.mesaro.common.exception.NotFoundException;
import com.mesaro.common.exception.ValidationException;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class TableCombinationService {

    private static final Logger log = LoggerFactory.getLogger(TableCombinationService.class);

    private final TableCombinationRepository combinationRepository;
    private final DiningTableRepository tableRepository;
    private final RestaurantService restaurantService;
    private final EntityManager entityManager;
    private final AuditService auditService;

    public TableCombinationService(
            TableCombinationRepository combinationRepository,
            DiningTableRepository tableRepository,
            RestaurantService restaurantService,
            EntityManager entityManager,
            AuditService auditService) {
        this.combinationRepository = combinationRepository;
        this.tableRepository = tableRepository;
        this.restaurantService = restaurantService;
        this.entityManager = entityManager;
        this.auditService = auditService;
    }

    public TableCombination findById(Long id) {
        return combinationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("TableCombination", id));
    }

    public TableCombination findByIdWithRestaurantAndTables(Long id) {
        return combinationRepository.findByIdWithRestaurantAndTables(id)
                .orElseThrow(() -> new NotFoundException("TableCombination", id));
    }

    public TableCombination findByIdAndRestaurant(Long id, Long restaurantId) {
        TableCombination combination = findById(id);
        if (!combination.getRestaurant().getId().equals(restaurantId)) {
            throw new NotFoundException("TableCombination", id);
        }
        restaurantService.findOperationalById(restaurantId);
        return combination;
    }

    public List<TableCombination> findByRestaurant(Long restaurantId) {
        restaurantService.findOperationalById(restaurantId);
        return combinationRepository.findByRestaurantIdOrderByName(restaurantId);
    }

    public List<TableCombination> findByRestaurantWithTables(Long restaurantId) {
        restaurantService.findOperationalById(restaurantId);
        return combinationRepository.findByRestaurantIdWithTables(restaurantId);
    }

    public List<TableCombination> findByCapacity(Long restaurantId, int partySize) {
        restaurantService.findOperationalById(restaurantId);
        return combinationRepository.findByRestaurantIdAndCapacityFitting(restaurantId, partySize);
    }

    @Transactional
    public TableCombination create(Long restaurantId, CreateCombinationRequest request) {
        Restaurant restaurant = restaurantService.findOperationalById(restaurantId);
        validateNameUnique(restaurantId, request.name(), null);

        Set<DiningTable> tables = resolveAndValidateTables(restaurantId, request.tableIds(), null);
        int totalSeats = tables.stream().mapToInt(DiningTable::getSeats).sum();

        int minCapacity = request.minCapacity() != null ? request.minCapacity() : 1;
        int maxCapacity = request.maxCapacity() != null ? request.maxCapacity() : totalSeats;

        validateCapacity(minCapacity, maxCapacity, totalSeats);

        TableCombination combination = new TableCombination(restaurant, request.name(), minCapacity, maxCapacity);
        tables.forEach(combination::addTable);

        TableCombination saved = combinationRepository.save(combination);
        log.info("Created combination '{}' with {} tables for restaurant {}",
                saved.getName(), tables.size(), restaurantId);
        auditService.record(
                AuditEventType.TABLE_COMBINATION_CREATED,
                restaurantId,
                null,
                saved.getId(),
                "TABLE_COMBINATION",
                Map.of("name", saved.getName(), "tableCount", tables.size())
        );
        return saved;
    }

    @Transactional
    public TableCombination update(Long restaurantId, Long combinationId, UpdateCombinationRequest request) {
        TableCombination combination = findByIdAndRestaurant(combinationId, restaurantId);

        if (request.name() != null && !request.name().isBlank()) {
            validateNameUnique(restaurantId, request.name(), combinationId);
            combination.setName(request.name());
        }

        if (request.tableIds() != null) {
            Set<DiningTable> tables = resolveAndValidateTables(restaurantId, request.tableIds(), combinationId);
            combination.clearTables();
            tables.forEach(combination::addTable);
        }

        int totalSeats = combination.getTotalSeats();
        int minCapacity = request.minCapacity() != null ? request.minCapacity() : combination.getMinCapacity();
        int maxCapacity = request.maxCapacity() != null ? request.maxCapacity() : combination.getMaxCapacity();

        validateCapacity(minCapacity, maxCapacity, totalSeats);
        combination.setMinCapacity(minCapacity);
        combination.setMaxCapacity(maxCapacity);

        entityManager.flush();
        Integer seatsSum = combinationRepository.sumSeatsByComboId(combination.getId());
        int actualMaxCapacity = seatsSum == null ? 0 : seatsSum;
        if (actualMaxCapacity > 0 && combination.getMaxCapacity() > actualMaxCapacity) {
            combination.setMaxCapacity(actualMaxCapacity);
            if (combination.getMinCapacity() > actualMaxCapacity) {
                combination.setMinCapacity(actualMaxCapacity);
            }
            log.info("Recalculated max_capacity for combination {} to {} seats",
                    combination.getId(), actualMaxCapacity);
        }

        TableCombination saved = combinationRepository.save(combination);
        log.info("Updated combination '{}' for restaurant {}", saved.getName(), restaurantId);
        auditService.record(
                AuditEventType.TABLE_COMBINATION_UPDATED,
                restaurantId,
                null,
                saved.getId(),
                "TABLE_COMBINATION",
                Map.of("name", saved.getName())
        );
        return saved;
    }

    @Transactional
    public void delete(Long restaurantId, Long combinationId) {
        TableCombination combination = findByIdAndRestaurant(combinationId, restaurantId);
        String name = combination.getName();
        combinationRepository.delete(combination);
        log.info("Deleted combination '{}' from restaurant {}", name, restaurantId);
        auditService.record(
                AuditEventType.TABLE_COMBINATION_DELETED,
                restaurantId,
                null,
                combinationId,
                "TABLE_COMBINATION",
                Map.of("name", name)
        );
    }

    private Set<DiningTable> resolveAndValidateTables(Long restaurantId, List<Long> tableIds, Long excludeCombinationId) {
        if (tableIds == null || tableIds.isEmpty()) {
            throw new ValidationException("At least one table is required", "tableIds");
        }

        Set<Long> uniqueIds = new HashSet<>(tableIds);
        if (uniqueIds.size() != tableIds.size()) {
            throw new ValidationException("Duplicate table IDs are not allowed", "tableIds");
        }

        Set<DiningTable> tables = new HashSet<>();
        for (Long tableId : uniqueIds) {
            DiningTable table = tableRepository.findById(tableId)
                    .orElseThrow(() -> new NotFoundException("DiningTable", tableId));

            if (!table.getRestaurant().getId().equals(restaurantId)) {
                throw new ValidationException("Table " + tableId + " does not belong to this restaurant", "tableIds");
            }
            tables.add(table);
        }

        if (!TableAreaCompatibility.canCombineAll(tables)) {
            throw new ValidationException(TableAreaCompatibility.describeConflict(tables), "tableIds");
        }

        return tables;
    }

    private void validateNameUnique(Long restaurantId, String name, Long excludeCombinationId) {
        combinationRepository.findByRestaurantIdAndName(restaurantId, name)
                .ifPresent(existing -> {
                    if (excludeCombinationId == null || !existing.getId().equals(excludeCombinationId)) {
                        throw new ValidationException("Combination with name '" + name + "' already exists", "name");
                    }
                });
    }

    private void validateCapacity(int minCapacity, int maxCapacity, int totalSeats) {
        if (minCapacity > maxCapacity) {
            throw new ValidationException("Minimum capacity cannot exceed maximum capacity", "minCapacity");
        }
        if (maxCapacity > totalSeats) {
            throw new ValidationException(
                    "Maximum capacity (" + maxCapacity + ") cannot exceed total seats (" + totalSeats + ")",
                    "maxCapacity");
        }
    }
}
