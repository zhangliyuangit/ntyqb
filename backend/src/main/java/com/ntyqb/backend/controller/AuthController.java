package com.ntyqb.backend.controller;

import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/auth/wechat/login")
    public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/auth/logout")
    public AuthDtos.SimpleMessageResponse logout() {
        return authService.logout();
    }

    @GetMapping("/health")
    public AuthDtos.SimpleMessageResponse health() {
        return new AuthDtos.SimpleMessageResponse("ok");
    }
}
