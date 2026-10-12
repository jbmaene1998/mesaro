package com.mesaro.logging;

public interface ApiActionEventPublisher {
    void publish(ApiActionEvent event);
}
