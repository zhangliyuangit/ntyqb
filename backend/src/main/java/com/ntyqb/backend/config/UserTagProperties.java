package com.ntyqb.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "app.user-tags")
public class UserTagProperties {

    private Map<Long, String> byId = new LinkedHashMap<>();

    public Map<Long, String> getById() {
        return byId;
    }

    public void setById(Map<Long, String> byId) {
        this.byId = byId == null ? new LinkedHashMap<>() : new LinkedHashMap<>(byId);
    }
}
