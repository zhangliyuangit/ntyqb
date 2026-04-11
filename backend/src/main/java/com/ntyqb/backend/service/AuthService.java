package com.ntyqb.backend.service;

import com.ntyqb.backend.config.AuthContext;
import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.entity.SessionToken;
import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.exception.BadRequestException;
import com.ntyqb.backend.exception.NotFoundException;
import com.ntyqb.backend.exception.UnauthorizedException;
import com.ntyqb.backend.repository.SessionTokenRepository;
import com.ntyqb.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final SessionTokenRepository sessionTokenRepository;
    private final UserTagService userTagService;
    private final WechatAuthClient wechatAuthClient;
    private final String authMode;
    private final int sessionDays;

    public AuthService(
            UserRepository userRepository,
            SessionTokenRepository sessionTokenRepository,
            UserTagService userTagService,
            WechatAuthClient wechatAuthClient,
            @Value("${app.auth.mode:wechat}") String authMode,
            @Value("${app.auth.session-days:14}") int sessionDays
    ) {
        this.userRepository = userRepository;
        this.sessionTokenRepository = sessionTokenRepository;
        this.userTagService = userTagService;
        this.wechatAuthClient = wechatAuthClient;
        this.authMode = authMode;
        this.sessionDays = sessionDays;
    }

    @Transactional
    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest request) {
        if (request.code() == null || request.code().isBlank()) {
            throw new BadRequestException("wx.login code 不能为空");
        }

        sessionTokenRepository.deleteByExpiresAtBefore(LocalDateTime.now());

        User user = "mock".equalsIgnoreCase(authMode) ? loginWithMock(request) : loginWithWechat(request);
        SessionToken sessionToken = new SessionToken();
        sessionToken.setUser(user);
        sessionToken.setToken(UUID.randomUUID().toString().replace("-", ""));
        sessionToken.setExpiresAt(LocalDateTime.now().plusDays(sessionDays));
        sessionTokenRepository.save(sessionToken);

        return new AuthDtos.LoginResponse(sessionToken.getToken(), authMode, toUserSummary(user));
    }

    @Transactional
    public AuthDtos.SimpleMessageResponse logout() {
        AuthContext.AuthInfo authInfo = AuthContext.get();
        if (authInfo != null && authInfo.token() != null) {
            sessionTokenRepository.deleteByToken(authInfo.token());
        }
        return new AuthDtos.SimpleMessageResponse("已退出登录");
    }

    public Long resolveToken(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("请先登录");
        }
        SessionToken sessionToken = sessionTokenRepository.findByToken(token)
                .orElseThrow(() -> new UnauthorizedException("登录已过期，请重新登录"));
        if (sessionToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            sessionTokenRepository.deleteByToken(token);
            throw new UnauthorizedException("登录已过期，请重新登录");
        }
        return sessionToken.getUser().getId();
    }

    public User requireCurrentUser() {
        AuthContext.AuthInfo authInfo = AuthContext.get();
        if (authInfo == null || authInfo.userId() == null) {
            throw new UnauthorizedException("请先登录");
        }
        return userRepository.findById(authInfo.userId())
                .orElseThrow(() -> new UnauthorizedException("当前用户不存在"));
    }

    public AuthDtos.UserSummaryDto toUserSummary(User user) {
        return new AuthDtos.UserSummaryDto(
                user.getId(),
                user.getNickname(),
                user.getAvatarUrl(),
                user.getStatus(),
                userTagService.getTag(user.getId())
        );
    }

    private User loginWithMock(AuthDtos.LoginRequest request) {
        String mockKey = Optional.ofNullable(request.mockUserKey())
                .filter(value -> !value.isBlank())
                .orElse("local-demo-user");

        User user = userRepository.findByMockKey(mockKey).orElseGet(() -> {
            User created = new User();
            created.setMockKey(mockKey);
            created.setOpenId("mock:" + mockKey);
            return created;
        });
        return initializeProfileIfNeeded(user, request);
    }

    private User loginWithWechat(AuthDtos.LoginRequest request) {
        String openId = "wechat:" + wechatAuthClient.resolveOpenId(request.code());
        User user = userRepository.findByOpenId(openId).orElseGet(() -> {
            User created = new User();
            created.setOpenId(openId);
            return created;
        });
        return initializeProfileIfNeeded(user, request);
    }

    public User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("用户不存在"));
    }

    private void validateProfile(AuthDtos.LoginRequest request) {
        if (request.nickname() == null || request.nickname().isBlank()) {
            throw new BadRequestException("请先填写微信昵称");
        }
        if (request.avatarUrl() == null || request.avatarUrl().isBlank()) {
            throw new BadRequestException("请先选择微信头像");
        }
    }

    private User initializeProfileIfNeeded(User user, AuthDtos.LoginRequest request) {
        if (!needsProfileInitialization(user)) {
            return user;
        }
        validateProfile(request);
        syncProfile(user, request);
        return userRepository.save(user);
    }

    private boolean needsProfileInitialization(User user) {
        return user.getId() == null
                || user.getNickname() == null
                || user.getNickname().isBlank()
                || user.getAvatarUrl() == null
                || user.getAvatarUrl().isBlank()
                || isTemporaryAvatarUrl(user.getAvatarUrl());
    }

    private boolean isTemporaryAvatarUrl(String avatarUrl) {
        if (avatarUrl == null) {
            return false;
        }
        String value = avatarUrl.trim().toLowerCase();
        return value.startsWith("http://tmp/")
                || value.startsWith("https://tmp/")
                || value.startsWith("wxfile://");
    }

    private void syncProfile(User user, AuthDtos.LoginRequest request) {
        user.setNickname(request.nickname().trim());
        user.setAvatarUrl(request.avatarUrl().trim());
    }
}
