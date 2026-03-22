package com.ntyqb.backend.service;

import com.ntyqb.backend.config.UserTagProperties;
import org.springframework.stereotype.Service;

@Service
public class UserTagService {

    private final UserTagProperties userTagProperties;

    public UserTagService(UserTagProperties userTagProperties) {
        this.userTagProperties = userTagProperties;
    }

    public String getTag(Long userId) {
        if (userId == null) {
            return null;
        }
        String value = userTagProperties.getById().get(userId);
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
