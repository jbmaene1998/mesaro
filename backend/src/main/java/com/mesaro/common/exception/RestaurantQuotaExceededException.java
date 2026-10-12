package com.mesaro.common.exception;

import com.mesaro.common.ErrorCode;
import org.springframework.http.HttpStatus;

public class RestaurantQuotaExceededException extends ApiException {
    public RestaurantQuotaExceededException(int maxRestaurants) {
        super(ErrorCode.BILLING_LIMIT_EXCEEDED,
                "You have reached your restaurant limit (" + maxRestaurants + "). "
                        + "Subscribe to an additional restaurant to add more locations.",
                HttpStatus.PAYMENT_REQUIRED);
    }
}
