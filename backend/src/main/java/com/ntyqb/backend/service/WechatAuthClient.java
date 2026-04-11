package com.ntyqb.backend.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ntyqb.backend.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class WechatAuthClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String appId;
    private final String appSecret;

    public WechatAuthClient(
            ObjectMapper objectMapper,
            RestClient.Builder restClientBuilder,
            @Value("${app.auth.wechat.api-base-url:https://api.weixin.qq.com}") String apiBaseUrl,
            @Value("${app.auth.wechat.app-id:}") String appId,
            @Value("${app.auth.wechat.app-secret:}") String appSecret
    ) {
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder.baseUrl(apiBaseUrl).build();
        this.appId = appId == null ? "" : appId.trim();
        this.appSecret = appSecret == null ? "" : appSecret.trim();
    }

    public String resolveOpenId(String code) {
        if (appId.isBlank() || appSecret.isBlank()) {
            throw new BadRequestException("微信登录暂未配置，请联系管理员");
        }
        try {
            String responseBody = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/sns/jscode2session")
                            .queryParam("appid", appId)
                            .queryParam("secret", appSecret)
                            .queryParam("js_code", code)
                            .queryParam("grant_type", "authorization_code")
                            .build())
                    .retrieve()
                    .body(String.class);
            WechatCode2SessionResponse response = parseResponse(responseBody);
            if (response == null || response.openid() == null || response.openid().isBlank()) {
                throw new BadRequestException("微信登录失败，请重新进入小程序后再试");
            }
            if (response.errcode() != null && response.errcode() != 0) {
                throw new BadRequestException("微信登录失败，请重新进入小程序后再试");
            }
            return response.openid().trim();
        } catch (RestClientException exception) {
            throw new BadRequestException("微信登录失败，请稍后重试");
        }
    }

    private WechatCode2SessionResponse parseResponse(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            throw new BadRequestException("微信登录失败，请稍后重试");
        }
        try {
            return objectMapper.readValue(responseBody, WechatCode2SessionResponse.class);
        } catch (JsonProcessingException exception) {
            throw new BadRequestException("微信登录失败，请稍后重试");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record WechatCode2SessionResponse(
            String openid,
            Integer errcode
    ) {
    }
}
