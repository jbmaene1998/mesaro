package com.mesaro.config;

import com.mesaro.logging.ApiActionLoggingInterceptor;
import com.mesaro.security.RestaurantContextInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final RestaurantContextInterceptor restaurantContextInterceptor;
    private final ApiActionLoggingInterceptor apiActionLoggingInterceptor;

    public WebConfig(RestaurantContextInterceptor restaurantContextInterceptor,
                     ApiActionLoggingInterceptor apiActionLoggingInterceptor) {
        this.restaurantContextInterceptor = restaurantContextInterceptor;
        this.apiActionLoggingInterceptor = apiActionLoggingInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(restaurantContextInterceptor)
                .addPathPatterns("/api/**");
        registry.addInterceptor(apiActionLoggingInterceptor)
                .addPathPatterns("/api/**");
    }
}
