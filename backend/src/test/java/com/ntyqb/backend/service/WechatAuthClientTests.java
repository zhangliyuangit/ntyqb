package com.ntyqb.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ntyqb.backend.exception.BadRequestException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WechatAuthClientTests {

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void shouldParseWechatJsonReturnedAsTextPlain() throws Exception {
        startServer("""
                {"openid":"openid-123","session_key":"session-abc"}
                """);

        WechatAuthClient client = new WechatAuthClient(
                new ObjectMapper(),
                RestClient.builder(),
                "http://127.0.0.1:" + server.getAddress().getPort(),
                "wx-app-id",
                "wx-secret"
        );

        assertThat(client.resolveOpenId("valid-code")).isEqualTo("openid-123");
    }

    @Test
    void shouldExposeWechatBusinessErrorsAsBadRequest() throws Exception {
        startServer("""
                {"errcode":40029,"errmsg":"invalid code"}
                """);

        WechatAuthClient client = new WechatAuthClient(
                new ObjectMapper(),
                RestClient.builder(),
                "http://127.0.0.1:" + server.getAddress().getPort(),
                "wx-app-id",
                "wx-secret"
        );

        assertThatThrownBy(() -> client.resolveOpenId("invalid-code"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("微信登录失败，请重新进入小程序后再试");
    }

    private void startServer(String responseBody) throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/sns/jscode2session", exchange -> writeJson(exchange, responseBody));
        server.start();
    }

    private void writeJson(HttpExchange exchange, String responseBody) throws IOException {
        byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream outputStream = exchange.getResponseBody()) {
            outputStream.write(bytes);
        } finally {
            exchange.close();
        }
    }
}
