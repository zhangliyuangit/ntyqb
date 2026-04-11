package com.ntyqb.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ntyqb.backend.service.WechatAuthClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.auth.mode=wechat",
        "app.seed.enabled=false"
})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class WechatAuthLoginApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private WechatAuthClient wechatAuthClient;

    @Test
    void shouldReuseSameUserWhenWechatCodesResolveToSameOpenId() throws Exception {
        when(wechatAuthClient.resolveOpenId("wx-code-1")).thenReturn("openid-same-user");
        when(wechatAuthClient.resolveOpenId("wx-code-2")).thenReturn("openid-same-user");

        JsonNode firstLogin = login("wx-code-1", "阿北", "https://example.com/avatar-a.png");
        JsonNode secondLogin = login("wx-code-2", "阿北新昵称", "https://example.com/avatar-b.png");

        assertThat(firstLogin.path("authMode").asText()).isEqualTo("wechat");
        assertThat(secondLogin.path("authMode").asText()).isEqualTo("wechat");
        assertThat(firstLogin.path("user").path("id").asLong()).isEqualTo(secondLogin.path("user").path("id").asLong());
    }

    private JsonNode login(String code, String nickname, String avatarUrl) throws Exception {
        String response = mockMvc.perform(post("/api/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code":"%s",
                                  "nickname":"%s",
                                  "avatarUrl":"%s"
                                }
                                """.formatted(code, nickname, avatarUrl)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").isNumber())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response);
    }
}
