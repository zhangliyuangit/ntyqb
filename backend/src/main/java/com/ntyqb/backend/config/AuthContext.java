package com.ntyqb.backend.config;

public final class AuthContext {

    private static final ThreadLocal<AuthInfo> HOLDER = new ThreadLocal<>();

    private AuthContext() {
    }

    public static void set(Long userId, String token) {
        HOLDER.set(new AuthInfo(userId, token));
    }

    public static AuthInfo get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }

    public record AuthInfo(Long userId, String token) {
    }
}
