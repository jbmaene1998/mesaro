package com.mesaro.table;

import com.mesaro.audit.AuditService;
import com.mesaro.hold.HoldRepository;
import com.mesaro.infra.TimeService;
import com.mesaro.reservation.ReservationRepository;
import com.mesaro.restaurant.Restaurant;
import com.mesaro.restaurant.RestaurantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DiningTableServiceTest {

    @Mock
    private DiningTableRepository tableRepository;
    @Mock
    private TableCombinationRepository combinationRepository;
    @Mock
    private HoldRepository holdRepository;
    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private RestaurantService restaurantService;
    @Mock
    private TimeService timeService;
    @Mock
    private AuditService auditService;

    private DiningTableService service;

    @BeforeEach
    void setUp() {
        service = new DiningTableService(
                tableRepository,
                combinationRepository,
                holdRepository,
                reservationRepository,
                restaurantService,
                timeService,
                auditService
        );
    }

    @Test
    void update_clampsCombinationMaxCapacityToPhysicalSeats() {
        Restaurant restaurant = new Restaurant("R", "r", "UTC");
        ReflectionTestUtils.setField(restaurant, "id", 1L);

        DiningTable table = new DiningTable(restaurant, "T1", 6);
        ReflectionTestUtils.setField(table, "id", 10L);

        TableCombination combination = new TableCombination(restaurant, "Combo", 4, 10);
        combination.addTable(table);
        ReflectionTestUtils.setField(combination, "id", 20L);

        when(tableRepository.findById(10L)).thenReturn(Optional.of(table));
        when(restaurantService.findOperationalById(1L)).thenReturn(restaurant);
        when(tableRepository.save(any(DiningTable.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(combinationRepository.findByTableId(10L)).thenReturn(List.of(combination));
        when(combinationRepository.sumSeatsByComboId(20L)).thenReturn(4);
        when(combinationRepository.save(any(TableCombination.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.update(1L, 10L, new UpdateTableRequest(null, 4, null, null, null));

        ArgumentCaptor<TableCombination> captor = ArgumentCaptor.forClass(TableCombination.class);
        verify(combinationRepository).save(captor.capture());
        assertThat(captor.getValue().getMaxCapacity()).isEqualTo(4);
        assertThat(captor.getValue().getMinCapacity()).isEqualTo(4);
    }
}
