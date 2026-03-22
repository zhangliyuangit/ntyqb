package com.ntyqb.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ApplicationApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldLoginAndLoadMe() throws Exception {
        String token = login("local-demo-user", "阿北", "https://example.com/avatar-demo.png");

        mockMvc.perform(get("/api/me").header("X-Auth-Token", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.nickname").value("阿北"))
                .andExpect(jsonPath("$.stats.length()").value(3));
    }

    @Test
    void shouldCreateAndConfirmBilliardsMatch() throws Exception {
        String demoToken = login("local-demo-user", "阿北", "https://example.com/avatar-demo.png");
        String zhouToken = login("user-zhou", "周周", "https://example.com/avatar-zhou.png");
        long demoUserId = currentUserId(demoToken);
        long zhouUserId = currentUserId(zhouToken);

        String createBody = """
                {
                  "sportType":"BILLIARDS",
                  "format":"SINGLES",
                  "winnerSide":"A",
                  "participantIdsA":[%d],
                  "participantIdsB":[%d],
                  "winMarginBalls":4,
                  "remark":"测试对局"
                }
                """.formatted(demoUserId, zhouUserId);

        String createResponse = mockMvc.perform(post("/api/matches")
                        .header("X-Auth-Token", demoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long matchId = objectMapper.readTree(createResponse).path("id").asLong();

        mockMvc.perform(post("/api/matches/" + matchId + "/confirm")
                        .header("X-Auth-Token", zhouToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        String leaderboard = mockMvc.perform(get("/api/leaderboards")
                        .header("X-Auth-Token", demoToken)
                        .param("sportType", "BILLIARDS"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode leaderboardNode = objectMapper.readTree(leaderboard);
        assertThat(leaderboardNode.path("ranked").isArray()).isTrue();
    }

    @Test
    void shouldAllowZeroWinMarginForBilliards() throws Exception {
        String demoToken = login("local-demo-user", "阿北", "https://example.com/avatar-demo.png");
        String zhouToken = login("user-zhou", "周周", "https://example.com/avatar-zhou.png");
        long demoUserId = currentUserId(demoToken);
        long zhouUserId = currentUserId(zhouToken);

        String createBody = """
                {
                  "sportType":"BILLIARDS",
                  "format":"SINGLES",
                  "winnerSide":"A",
                  "participantIdsA":[%d],
                  "participantIdsB":[%d],
                  "winMarginBalls":0,
                  "remark":"零封之外也支持平净胜"
                }
                """.formatted(demoUserId, zhouUserId);

        mockMvc.perform(post("/api/matches")
                        .header("X-Auth-Token", demoToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detail.winMarginBalls").value(0))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void shouldRejectPendingMatch() throws Exception {
        String demoToken = login("local-demo-user", "阿北", "https://example.com/avatar-demo.png");

        String matchesResponse = mockMvc.perform(get("/api/matches")
                        .header("X-Auth-Token", demoToken)
                        .param("scope", "pending_confirmation"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode pendingItems = objectMapper.readTree(matchesResponse).path("items");
        Long pendingId = pendingItems.get(0).path("id").asLong();

        mockMvc.perform(post("/api/matches/" + pendingId + "/reject")
                        .header("X-Auth-Token", demoToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void shouldListAllMatchesForHomeFeed() throws Exception {
        String demoToken = login("local-demo-user", "阿北", "https://example.com/avatar-demo.png");

        String mineResponse = mockMvc.perform(get("/api/matches")
                        .header("X-Auth-Token", demoToken)
                        .param("scope", "mine")
                        .param("status", "CONFIRMED"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String allResponse = mockMvc.perform(get("/api/matches")
                        .header("X-Auth-Token", demoToken)
                        .param("scope", "all")
                        .param("status", "CONFIRMED"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode mineItems = objectMapper.readTree(mineResponse).path("items");
        JsonNode allItems = objectMapper.readTree(allResponse).path("items");

        assertThat(allItems.size()).isGreaterThan(mineItems.size());
        assertThat(allItems)
                .anyMatch(item -> item.path("initiatorId").asLong() == 6L);
    }

    @Test
    void shouldInitializeProfileOnceAndReuseItOnLaterLogin() throws Exception {
        String firstToken = login("local-demo-user", "球王阿北", "https://example.com/avatar-new.png");

        mockMvc.perform(get("/api/me").header("X-Auth-Token", firstToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.nickname").value("球王阿北"))
                .andExpect(jsonPath("$.user.avatarUrl").value("https://example.com/avatar-new.png"));

        String secondToken = login("local-demo-user", "另一个昵称", "https://example.com/avatar-other.png");

        mockMvc.perform(get("/api/me").header("X-Auth-Token", secondToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.nickname").value("球王阿北"))
                .andExpect(jsonPath("$.user.avatarUrl").value("https://example.com/avatar-new.png"));
    }

    private String login(String mockUserKey, String nickname, String avatarUrl) throws Exception {
        String response = mockMvc.perform(post("/api/auth/wechat/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code":"test-code",
                                  "mockUserKey":"%s",
                                  "nickname":"%s",
                                  "avatarUrl":"%s"
                                }
                                """.formatted(mockUserKey, nickname, avatarUrl)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).path("token").asText();
    }

    private long currentUserId(String token) throws Exception {
        String response = mockMvc.perform(get("/api/me").header("X-Auth-Token", token))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).path("user").path("id").asLong();
    }
}
