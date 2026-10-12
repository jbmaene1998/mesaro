package com.mesaro.reservation;

import java.util.List;

public record SwitchTablesRequest(
        List<Long> tableIds,
        Long combinationId
) {
}
