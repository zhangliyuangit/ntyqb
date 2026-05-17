# Home Assistant Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a logged-in-only home-page chat assistant entry that opens a bottom sheet and uses a Spring Boot AgentScope-backed API to add and query match records through controlled tools.

**Architecture:** The frontend owns the home entry, bottom-sheet chat UI, message state, and assistant API client. The backend owns authentication, assistant DTOs, action confirmation, and controlled tools that reuse `MatchService` and `UserService`; the model never writes to repositories directly. The first shippable slice works without a model key by showing the UI and returning a clear backend unavailable response.

**Tech Stack:** WeChat Mini Program TypeScript/WXML/WXSS, Node.js built-in tests, Java 17, Spring Boot 3.3, Maven, AgentScope Java, JUnit/MockMvc.

---

## File Structure

- `frontend/miniprogram/pages/home/index.ts` and `index.js`: home-page assistant state, open/close/send/confirm handlers.
- `frontend/miniprogram/pages/home/index.wxml`: logged-in-only assistant entry and bottom sheet markup.
- `frontend/miniprogram/pages/home/index.wxss`: entry and chat bottom-sheet styling.
- `frontend/miniprogram/services/api.ts` and `api.js`: assistant chat and action-confirm API wrappers.
- `frontend/miniprogram/types/models.ts`: assistant request/response/action types.
- `frontend/tests/home-assistant.test.js`: source-level tests for entry visibility, sheet behavior, and API wrappers.
- `backend/pom.xml`: AgentScope dependency when the real agent slice is implemented.
- `backend/src/main/resources/application.yml`: assistant feature flag and model settings.
- `backend/src/main/java/com/ntyqb/backend/assistant/AssistantDtos.java`: request/response/action DTOs.
- `backend/src/main/java/com/ntyqb/backend/assistant/AssistantProperties.java`: typed configuration.
- `backend/src/main/java/com/ntyqb/backend/assistant/AssistantActionStore.java`: in-memory TTL action storage.
- `backend/src/main/java/com/ntyqb/backend/assistant/AssistantController.java`: authenticated assistant endpoints.
- `backend/src/main/java/com/ntyqb/backend/assistant/AssistantService.java`: orchestration for unavailable mode, chat, and action confirmation.
- `backend/src/main/java/com/ntyqb/backend/assistant/MatchAssistantTools.java`: controlled match/user tools reused by AgentScope.
- `backend/src/main/java/com/ntyqb/backend/NtyqbApplication.java`: enable configuration properties if needed.
- `backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java`: assistant API integration tests.

## Task 1: Frontend Home Entry And Static Bottom Sheet

**Files:**
- Modify: `frontend/miniprogram/pages/home/index.ts`
- Modify: `frontend/miniprogram/pages/home/index.js`
- Modify: `frontend/miniprogram/pages/home/index.wxml`
- Modify: `frontend/miniprogram/pages/home/index.wxss`
- Create: `frontend/tests/home-assistant.test.js`

- [ ] **Step 1: Write frontend source tests**

Create `frontend/tests/home-assistant.test.js` with these tests:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("home page renders assistant entry only for logged-in users", () => {
  const wxml = read("miniprogram/pages/home/index.wxml");

  assert.equal(wxml.includes('wx:if="{{loggedIn}}" class="assistant-entry section"'), true);
  assert.equal(wxml.includes('bindtap="openAssistant"'), true);
  assert.equal(wxml.includes("记录助手"), true);
  assert.equal(wxml.includes("一句话添加或查询球局"), true);
});

test("home page assistant bottom sheet has chat structure", () => {
  const wxml = read("miniprogram/pages/home/index.wxml");

  assert.equal(wxml.includes('wx:if="{{assistantVisible}}" class="assistant-overlay"'), true);
  assert.equal(wxml.includes('class="assistant-sheet"'), true);
  assert.equal(wxml.includes('wx:for="{{assistantMessages}}"'), true);
  assert.equal(wxml.includes('value="{{assistantInput}}"'), true);
  assert.equal(wxml.includes('bindtap="sendAssistantMessage"'), true);
  assert.equal(wxml.includes('bindtap="closeAssistant"'), true);
});

test("home page assistant state and handlers are defined", () => {
  const source = read("miniprogram/pages/home/index.ts");

  assert.equal(source.includes("assistantVisible: false"), true);
  assert.equal(source.includes("assistantMessages:"), true);
  assert.equal(source.includes("assistantSuggestions:"), true);
  assert.equal(source.includes("openAssistant()"), true);
  assert.equal(source.includes("closeAssistant()"), true);
  assert.equal(source.includes("onAssistantInput"), true);
  assert.equal(source.includes("sendAssistantMessage"), true);
});

test("home page assistant styles include sheet and entry classes", () => {
  const wxss = read("miniprogram/pages/home/index.wxss");

  assert.equal(wxss.includes(".assistant-entry"), true);
  assert.equal(wxss.includes(".assistant-overlay"), true);
  assert.equal(wxss.includes(".assistant-sheet"), true);
  assert.equal(wxss.includes("height: 78vh"), true);
  assert.equal(wxss.includes(".assistant-input-bar"), true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd frontend
npm test
```

Expected: `home-assistant.test.js` fails because assistant entry, sheet, state, and handlers do not exist yet.

- [ ] **Step 3: Add assistant state and handlers to the TypeScript page**

Modify `frontend/miniprogram/pages/home/index.ts`.

Add this constant near `SPORT_OPTIONS`:

```ts
const ASSISTANT_SUGGESTIONS = [
  "我今天台球赢了张三，净胜 3 球",
  "查我最近的台球记录",
  "我有哪些待确认？"
];
```

Add these fields to `data`:

```ts
assistantVisible: false,
assistantInput: "",
assistantSending: false,
assistantSuggestions: ASSISTANT_SUGGESTIONS,
assistantMessages: [
  {
    id: "welcome",
    role: "assistant",
    content: "可以帮你添加比赛、查询战绩、查看待确认。"
  }
],
assistantDraftAction: null
```

Add these methods inside the object passed to `Page()`:

```ts
openAssistant() {
  if (!this.data.loggedIn) {
    return;
  }
  this.setData({ assistantVisible: true });
},
closeAssistant() {
  if (this.data.assistantSending) {
    return;
  }
  this.setData({
    assistantVisible: false,
    assistantInput: "",
    assistantDraftAction: null
  });
},
onAssistantInput(event: WechatMiniprogram.Input) {
  this.setData({ assistantInput: event.detail.value });
},
useAssistantSuggestion(event: WechatMiniprogram.BaseEvent) {
  const text = event.currentTarget.dataset.text || "";
  this.setData({ assistantInput: text });
},
sendAssistantMessage() {
  const content = `${this.data.assistantInput || ""}`.trim();
  if (!content || this.data.assistantSending) {
    return;
  }
  const nextMessages = [
    ...(this.data.assistantMessages as Array<{ id: string; role: string; content: string }>),
    {
      id: `user-${Date.now()}`,
      role: "user",
      content
    },
    {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "第一版先把入口和浮层搭好，接下来会接入后端记录助手。"
    }
  ];
  this.setData({
    assistantInput: "",
    assistantMessages: nextMessages
  });
}
```

- [ ] **Step 4: Mirror the same state and handlers in runtime JavaScript**

Modify `frontend/miniprogram/pages/home/index.js` with the JavaScript equivalent:

```js
const ASSISTANT_SUGGESTIONS = [
  "我今天台球赢了张三，净胜 3 球",
  "查我最近的台球记录",
  "我有哪些待确认？"
];
```

Add the same `data` keys and methods as Task 1 Step 3, without TypeScript type annotations.

- [ ] **Step 5: Add entry and sheet markup**

Modify `frontend/miniprogram/pages/home/index.wxml`.

Insert this block immediately after the existing notice block whose opening tag is `<view class="notice section">`:

```xml
<view wx:if="{{loggedIn}}" class="assistant-entry section" bindtap="openAssistant">
  <view class="assistant-entry-main">
    <view class="assistant-entry-title">记录助手</view>
    <view class="assistant-entry-subtitle">一句话添加或查询球局</view>
  </view>
  <view class="assistant-entry-action">开始</view>
</view>
```

Insert this block before the final closing `</view>` of the page:

```xml
<view wx:if="{{assistantVisible}}" class="assistant-overlay" catchtouchmove="noop">
  <view class="assistant-mask" bindtap="closeAssistant"></view>
  <view class="assistant-sheet" catchtap="noop">
    <view class="assistant-sheet-handle"></view>
    <view class="assistant-sheet-head">
      <view>
        <view class="assistant-sheet-title">记录助手</view>
        <view class="assistant-sheet-subtitle">可以帮你添加比赛、查询战绩、查看待确认</view>
      </view>
      <view class="assistant-close" bindtap="closeAssistant">关闭</view>
    </view>

    <scroll-view scroll-y class="assistant-message-list">
      <view
        wx:for="{{assistantMessages}}"
        wx:key="id"
        class="assistant-message {{item.role === 'user' ? 'user' : 'assistant'}}"
      >
        <view class="assistant-bubble">{{item.content}}</view>
      </view>
      <view class="assistant-suggestions">
        <view
          wx:for="{{assistantSuggestions}}"
          wx:key="*this"
          class="assistant-suggestion"
          data-text="{{item}}"
          bindtap="useAssistantSuggestion"
        >{{item}}</view>
      </view>
    </scroll-view>

    <view class="assistant-input-bar">
      <input
        class="assistant-input"
        value="{{assistantInput}}"
        placeholder="比如：我今天台球赢了张三，净胜 3 球"
        placeholder-class="field-placeholder"
        confirm-type="send"
        bindinput="onAssistantInput"
        bindconfirm="sendAssistantMessage"
      />
      <view class="assistant-send {{assistantSending ? 'disabled' : ''}}" bindtap="sendAssistantMessage">
        {{assistantSending ? '发送中' : '发送'}}
      </view>
    </view>
  </view>
</view>
```

- [ ] **Step 6: Add styles**

Append to `frontend/miniprogram/pages/home/index.wxss`:

```css
.assistant-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 26rpx 28rpx;
  border-radius: 22rpx;
  background: #ffffff;
  border: 1rpx solid rgba(222, 231, 240, 0.95);
  box-shadow: 0 12rpx 30rpx rgba(18, 28, 45, 0.06);
}

.assistant-entry-main {
  min-width: 0;
}

.assistant-entry-title {
  color: #172033;
  font-size: 31rpx;
  font-weight: 700;
  line-height: 1.25;
}

.assistant-entry-subtitle {
  margin-top: 6rpx;
  color: #6c7787;
  font-size: 23rpx;
  line-height: 1.35;
}

.assistant-entry-action {
  flex: 0 0 auto;
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  color: #ffffff;
  background: #07c160;
  font-size: 23rpx;
  font-weight: 700;
}

.assistant-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
}

.assistant-mask {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.36);
}

.assistant-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 78vh;
  display: flex;
  flex-direction: column;
  border-radius: 30rpx 30rpx 0 0;
  background: #f7f8fa;
  overflow: hidden;
}

.assistant-sheet-handle {
  align-self: center;
  width: 72rpx;
  height: 8rpx;
  margin-top: 14rpx;
  border-radius: 999rpx;
  background: #d8dee8;
}

.assistant-sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
  padding: 22rpx 30rpx 18rpx;
  border-bottom: 1rpx solid rgba(222, 231, 240, 0.95);
}

.assistant-sheet-title {
  color: #172033;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1.25;
}

.assistant-sheet-subtitle {
  margin-top: 6rpx;
  color: #6c7787;
  font-size: 22rpx;
  line-height: 1.35;
}

.assistant-close {
  flex: 0 0 auto;
  color: #576172;
  font-size: 24rpx;
  line-height: 1.4;
}

.assistant-message-list {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  padding: 24rpx 24rpx 150rpx;
}

.assistant-message {
  display: flex;
  margin-bottom: 18rpx;
}

.assistant-message.user {
  justify-content: flex-end;
}

.assistant-bubble {
  max-width: 78%;
  box-sizing: border-box;
  padding: 18rpx 22rpx;
  border-radius: 20rpx;
  color: #172033;
  background: #ffffff;
  font-size: 25rpx;
  line-height: 1.45;
}

.assistant-message.user .assistant-bubble {
  color: #ffffff;
  background: #07c160;
}

.assistant-suggestions {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 16rpx;
}

.assistant-suggestion {
  align-self: flex-start;
  max-width: 88%;
  padding: 16rpx 20rpx;
  border-radius: 999rpx;
  color: #0f8e4a;
  background: rgba(7, 193, 96, 0.1);
  font-size: 23rpx;
  line-height: 1.35;
}

.assistant-input-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid rgba(222, 231, 240, 0.95);
}

.assistant-input {
  flex: 1;
  min-width: 0;
  height: 74rpx;
  box-sizing: border-box;
  padding: 0 24rpx;
  border-radius: 999rpx;
  color: #172033;
  background: #f1f4f8;
  font-size: 25rpx;
}

.assistant-send {
  flex: 0 0 auto;
  min-width: 92rpx;
  height: 74rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  color: #ffffff;
  background: #07c160;
  font-size: 24rpx;
  font-weight: 700;
}

.assistant-send.disabled {
  opacity: 0.6;
}
```

- [ ] **Step 7: Run frontend tests**

Run:

```bash
cd frontend
npm test
```

Expected: all frontend tests pass.

- [ ] **Step 8: Commit Task 1**

```bash
git add frontend/miniprogram/pages/home/index.ts frontend/miniprogram/pages/home/index.js frontend/miniprogram/pages/home/index.wxml frontend/miniprogram/pages/home/index.wxss frontend/tests/home-assistant.test.js
git commit -m "feat: add home assistant chat sheet"
```

## Task 2: Backend Assistant API Skeleton

**Files:**
- Modify: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantDtos.java`
- Create: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantProperties.java`
- Create: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantActionStore.java`
- Create: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantService.java`
- Create: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantController.java`
- Modify: `backend/src/main/java/com/ntyqb/backend/NtyqbApplication.java`
- Modify: `backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java`

- [ ] **Step 1: Add failing backend tests**

Append these tests to `backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java`:

```java
@Test
void shouldRequireLoginForAssistantChat() throws Exception {
    mockMvc.perform(post("/api/assistant/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"message\":\"你好\"}"))
            .andExpect(status().isUnauthorized());
}

@Test
void shouldReturnAssistantUnavailableWhenModelIsNotConfigured() throws Exception {
    String token = login("assistant-user", "小助", "https://example.com/avatar-assistant.png");

    mockMvc.perform(post("/api/assistant/chat")
                    .header("X-Auth-Token", token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"message\":\"你好\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.conversationId", notNullValue()))
            .andExpect(jsonPath("$.reply").value("记录助手暂未开启"))
            .andExpect(jsonPath("$.pendingAction").doesNotExist())
            .andExpect(jsonPath("$.results").isArray());
}

@Test
void shouldRejectMissingAssistantAction() throws Exception {
    String token = login("assistant-user", "小助", "https://example.com/avatar-assistant.png");

    mockMvc.perform(post("/api/assistant/actions/missing-action/confirm")
                    .header("X-Auth-Token", token))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("待确认动作已过期，请重新描述一次"));
}
```

- [ ] **Step 2: Run backend tests to verify they fail**

Run:

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

Expected: compilation or tests fail because `/api/assistant/*` does not exist.

- [ ] **Step 3: Add assistant config**

Append to `backend/src/main/resources/application.yml` under `app:`:

```yaml
  assistant:
    enabled: true
    model-provider: dashscope
    model-name: qwen-max
    api-key: ${ASSISTANT_MODEL_API_KEY:}
```

Modify `backend/src/main/java/com/ntyqb/backend/NtyqbApplication.java`:

```java
package com.ntyqb.backend;

import com.ntyqb.backend.assistant.AssistantProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AssistantProperties.class)
public class NtyqbApplication {

    public static void main(String[] args) {
        SpringApplication.run(NtyqbApplication.class, args);
    }
}
```

- [ ] **Step 4: Create assistant DTOs**

Create `backend/src/main/java/com/ntyqb/backend/assistant/AssistantDtos.java`:

```java
package com.ntyqb.backend.assistant;

import com.ntyqb.backend.dto.MatchDtos;

import java.util.List;
import java.util.Map;

public final class AssistantDtos {

    private AssistantDtos() {
    }

    public record ChatRequest(
            String conversationId,
            String message
    ) {
    }

    public record ChatResponse(
            String conversationId,
            String reply,
            PendingActionDto pendingAction,
            List<ResultDto> results
    ) {
    }

    public record PendingActionDto(
            String id,
            String type,
            String summary,
            Map<String, Object> payload
    ) {
    }

    public record ResultDto(
            String type,
            String title,
            String subtitle,
            Long matchId
    ) {
    }

    public record ConfirmActionResponse(
            String reply,
            MatchDtos.MatchDetailDto match
    ) {
    }
}
```

- [ ] **Step 5: Create assistant properties**

Create `backend/src/main/java/com/ntyqb/backend/assistant/AssistantProperties.java`:

```java
package com.ntyqb.backend.assistant;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.assistant")
public class AssistantProperties {

    private boolean enabled = true;
    private String modelProvider = "dashscope";
    private String modelName = "qwen-max";
    private String apiKey = "";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getModelProvider() {
        return modelProvider;
    }

    public void setModelProvider(String modelProvider) {
        this.modelProvider = modelProvider;
    }

    public String getModelName() {
        return modelName;
    }

    public void setModelName(String modelName) {
        this.modelName = modelName;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public boolean isModelConfigured() {
        return enabled && apiKey != null && !apiKey.isBlank();
    }
}
```

- [ ] **Step 6: Create in-memory action store**

Create `backend/src/main/java/com/ntyqb/backend/assistant/AssistantActionStore.java`:

```java
package com.ntyqb.backend.assistant;

import com.ntyqb.backend.dto.MatchDtos;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AssistantActionStore {

    private static final long TTL_SECONDS = 600;

    private final Clock clock;
    private final Map<String, StoredAction> actions = new ConcurrentHashMap<>();

    public AssistantActionStore() {
        this(Clock.systemDefaultZone());
    }

    AssistantActionStore(Clock clock) {
        this.clock = clock;
    }

    public String putCreateMatch(Long userId, MatchDtos.CreateMatchRequest payload, String summary) {
        String id = UUID.randomUUID().toString();
        actions.put(id, new StoredAction(userId, "CREATE_MATCH", payload, summary, Instant.now(clock).plusSeconds(TTL_SECONDS)));
        return id;
    }

    public Optional<StoredAction> consume(String id, Long userId) {
        StoredAction action = actions.remove(id);
        if (action == null || !action.userId().equals(userId) || action.expiresAt().isBefore(Instant.now(clock))) {
            return Optional.empty();
        }
        return Optional.of(action);
    }

    public record StoredAction(
            Long userId,
            String type,
            MatchDtos.CreateMatchRequest createMatchPayload,
            String summary,
            Instant expiresAt
    ) {
    }
}
```

- [ ] **Step 7: Create assistant service skeleton**

Create `backend/src/main/java/com/ntyqb/backend/assistant/AssistantService.java`:

```java
package com.ntyqb.backend.assistant;

import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.exception.BadRequestException;
import com.ntyqb.backend.service.MatchService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AssistantService {

    private final AssistantProperties properties;
    private final AssistantActionStore actionStore;
    private final MatchService matchService;

    public AssistantService(
            AssistantProperties properties,
            AssistantActionStore actionStore,
            MatchService matchService
    ) {
        this.properties = properties;
        this.actionStore = actionStore;
        this.matchService = matchService;
    }

    public AssistantDtos.ChatResponse chat(AssistantDtos.ChatRequest request, User currentUser) {
        String conversationId = request.conversationId() == null || request.conversationId().isBlank()
                ? UUID.randomUUID().toString()
                : request.conversationId();
        if (!properties.isModelConfigured()) {
            return new AssistantDtos.ChatResponse(
                    conversationId,
                    "记录助手暂未开启",
                    null,
                    List.of()
            );
        }
        return new AssistantDtos.ChatResponse(
                conversationId,
                "记录助手正在接入中",
                null,
                List.of()
        );
    }

    public AssistantDtos.ConfirmActionResponse confirmAction(String actionId, User currentUser) {
        AssistantActionStore.StoredAction action = actionStore.consume(actionId, currentUser.getId())
                .orElseThrow(() -> new BadRequestException("待确认动作已过期，请重新描述一次"));
        if (!"CREATE_MATCH".equals(action.type())) {
            throw new BadRequestException("暂不支持该确认动作");
        }
        return new AssistantDtos.ConfirmActionResponse(
                "已发起比赛记录，等待对手确认后会进入正式统计。",
                matchService.createMatch(action.createMatchPayload(), currentUser)
        );
    }
}
```

- [ ] **Step 8: Create assistant controller**

Create `backend/src/main/java/com/ntyqb/backend/assistant/AssistantController.java`:

```java
package com.ntyqb.backend.assistant;

import com.ntyqb.backend.entity.User;
import com.ntyqb.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/assistant")
public class AssistantController {

    private final AuthService authService;
    private final AssistantService assistantService;

    public AssistantController(AuthService authService, AssistantService assistantService) {
        this.authService = authService;
        this.assistantService = assistantService;
    }

    @PostMapping("/chat")
    public AssistantDtos.ChatResponse chat(@Valid @RequestBody AssistantDtos.ChatRequest request) {
        User user = authService.requireCurrentUser();
        return assistantService.chat(request, user);
    }

    @PostMapping("/actions/{actionId}/confirm")
    public AssistantDtos.ConfirmActionResponse confirmAction(@PathVariable String actionId) {
        User user = authService.requireCurrentUser();
        return assistantService.confirmAction(actionId, user);
    }
}
```

- [ ] **Step 9: Run backend tests**

Run:

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

Expected: all backend tests pass, including the new assistant skeleton tests.

- [ ] **Step 10: Commit Task 2**

```bash
git add backend/src/main/resources/application.yml backend/src/main/java/com/ntyqb/backend/NtyqbApplication.java backend/src/main/java/com/ntyqb/backend/assistant backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java
git commit -m "feat: add assistant api skeleton"
```

## Task 3: Assistant API Client And Frontend Wiring

**Files:**
- Modify: `frontend/miniprogram/types/models.ts`
- Modify: `frontend/miniprogram/services/api.ts`
- Modify: `frontend/miniprogram/services/api.js`
- Modify: `frontend/miniprogram/pages/home/index.ts`
- Modify: `frontend/miniprogram/pages/home/index.js`
- Modify: `frontend/miniprogram/pages/home/index.wxml`
- Modify: `frontend/tests/home-assistant.test.js`

- [ ] **Step 1: Extend frontend tests**

Append to `frontend/tests/home-assistant.test.js`:

```js
test("assistant api wrappers are exported", () => {
  const source = read("miniprogram/services/api.ts");
  const models = read("miniprogram/types/models.ts");

  assert.equal(source.includes("sendAssistantMessage"), true);
  assert.equal(source.includes('url: "/assistant/chat"'), true);
  assert.equal(source.includes("confirmAssistantAction"), true);
  assert.equal(source.includes("`/assistant/actions/${actionId}/confirm`"), true);
  assert.equal(models.includes("AssistantChatRequest"), true);
  assert.equal(models.includes("AssistantChatResponse"), true);
  assert.equal(models.includes("AssistantPendingAction"), true);
});

test("home page uses assistant api and renders pending action confirmation", () => {
  const source = read("miniprogram/pages/home/index.ts");
  const wxml = read("miniprogram/pages/home/index.wxml");

  assert.equal(source.includes('sendAssistantMessage as sendAssistantChatMessage'), true);
  assert.equal(source.includes("confirmAssistantAction"), true);
  assert.equal(source.includes("assistantConversationId"), true);
  assert.equal(source.includes("assistantDraftAction: response.pendingAction || null"), true);
  assert.equal(wxml.includes('wx:if="{{assistantDraftAction}}"'), true);
  assert.equal(wxml.includes('bindtap="confirmAssistantDraftAction"'), true);
});
```

- [ ] **Step 2: Run frontend tests to verify they fail**

Run:

```bash
cd frontend
npm test
```

Expected: new tests fail because API wrappers and pending-action UI are not wired yet.

- [ ] **Step 3: Add assistant frontend models**

Append to `frontend/miniprogram/types/models.ts`:

```ts
export interface AssistantChatRequest {
  conversationId?: string;
  message: string;
}

export interface AssistantPendingAction {
  id: string;
  type: "CREATE_MATCH";
  summary: string;
  payload: Record<string, any>;
}

export interface AssistantResult {
  type: string;
  title: string;
  subtitle?: string;
  matchId?: number;
}

export interface AssistantChatResponse {
  conversationId: string;
  reply: string;
  pendingAction?: AssistantPendingAction;
  results: AssistantResult[];
}

export interface AssistantConfirmActionResponse {
  reply: string;
  match?: MatchDetail;
}
```

- [ ] **Step 4: Add API wrappers**

Modify the import from `../types/models` in `frontend/miniprogram/services/api.ts` to include:

```ts
AssistantChatRequest,
AssistantChatResponse,
AssistantConfirmActionResponse,
```

Add these exports after `listMatches`:

```ts
export async function sendAssistantMessage(requestPayload: AssistantChatRequest): Promise<AssistantChatResponse> {
  return request<AssistantChatResponse>({
    method: "POST",
    url: "/assistant/chat",
    data: requestPayload
  });
}

export async function confirmAssistantAction(actionId: string): Promise<AssistantConfirmActionResponse> {
  return request<AssistantConfirmActionResponse>({
    method: "POST",
    url: `/assistant/actions/${actionId}/confirm`
  });
}
```

Mirror the same functions in `frontend/miniprogram/services/api.js`.

- [ ] **Step 5: Wire home page to API**

Modify the import in `frontend/miniprogram/pages/home/index.ts`:

```ts
import {
  confirmAssistantAction,
  getMe,
  isAuthError,
  isLoggedIn,
  listMatches,
  sendAssistantMessage as sendAssistantChatMessage
} from "../../services/api";
```

Add to `data`:

```ts
assistantConversationId: "",
```

Replace the static `sendAssistantMessage()` method from Task 1 with:

```ts
async sendAssistantMessage() {
  const content = `${this.data.assistantInput || ""}`.trim();
  if (!content || this.data.assistantSending) {
    return;
  }
  const userMessage = {
    id: `user-${Date.now()}`,
    role: "user",
    content
  };
  const currentMessages = this.data.assistantMessages as Array<{ id: string; role: string; content: string }>;
  this.setData({
    assistantInput: "",
    assistantSending: true,
    assistantDraftAction: null,
    assistantMessages: [...currentMessages, userMessage]
  });
  try {
    const response = await sendAssistantChatMessage({
      conversationId: this.data.assistantConversationId || undefined,
      message: content
    });
    this.setData({
      assistantConversationId: response.conversationId,
      assistantDraftAction: response.pendingAction || null,
      assistantMessages: [
        ...(this.data.assistantMessages as Array<{ id: string; role: string; content: string }>),
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.reply
        }
      ]
    });
  } catch (error: any) {
    this.setData({
      assistantMessages: [
        ...(this.data.assistantMessages as Array<{ id: string; role: string; content: string }>),
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: error?.message || "刚刚没听清，可以换个说法再试一次"
        }
      ]
    });
  } finally {
    this.setData({ assistantSending: false });
  }
},
async confirmAssistantDraftAction() {
  const action = this.data.assistantDraftAction as { id: string } | null;
  if (!action || this.data.assistantSending) {
    return;
  }
  this.setData({ assistantSending: true });
  try {
    const response = await confirmAssistantAction(action.id);
    this.setData({
      assistantDraftAction: null,
      assistantMessages: [
        ...(this.data.assistantMessages as Array<{ id: string; role: string; content: string }>),
        {
          id: `assistant-confirm-${Date.now()}`,
          role: "assistant",
          content: response.reply
        }
      ]
    });
    await this.loadPage();
  } catch (error: any) {
    wx.showToast({ title: error?.message || "确认失败", icon: "none" });
  } finally {
    this.setData({ assistantSending: false });
  }
}
```

Mirror the same imports, data, and methods in `frontend/miniprogram/pages/home/index.js`.

- [ ] **Step 6: Render pending action confirmation**

Add this block inside `assistant-message-list` in `frontend/miniprogram/pages/home/index.wxml`, after the message loop and before suggestions:

```xml
<view wx:if="{{assistantDraftAction}}" class="assistant-action-card">
  <view class="assistant-action-title">请确认这条记录</view>
  <view class="assistant-action-summary">{{assistantDraftAction.summary}}</view>
  <view class="assistant-action-confirm" bindtap="confirmAssistantDraftAction">
    {{assistantSending ? '确认中' : '确认创建'}}
  </view>
</view>
```

Add to `frontend/miniprogram/pages/home/index.wxss`:

```css
.assistant-action-card {
  margin: 18rpx 0 22rpx;
  padding: 20rpx;
  border-radius: 20rpx;
  background: #ffffff;
  border: 1rpx solid rgba(222, 231, 240, 0.95);
}

.assistant-action-title {
  color: #172033;
  font-size: 25rpx;
  font-weight: 700;
}

.assistant-action-summary {
  margin-top: 8rpx;
  color: #576172;
  font-size: 24rpx;
  line-height: 1.45;
}

.assistant-action-confirm {
  margin-top: 16rpx;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  color: #ffffff;
  background: #07c160;
  font-size: 24rpx;
  font-weight: 700;
}
```

- [ ] **Step 7: Run frontend tests**

Run:

```bash
cd frontend
npm test
```

Expected: all frontend tests pass.

- [ ] **Step 8: Commit Task 3**

```bash
git add frontend/miniprogram/types/models.ts frontend/miniprogram/services/api.ts frontend/miniprogram/services/api.js frontend/miniprogram/pages/home/index.ts frontend/miniprogram/pages/home/index.js frontend/miniprogram/pages/home/index.wxml frontend/miniprogram/pages/home/index.wxss frontend/tests/home-assistant.test.js
git commit -m "feat: connect home assistant chat api"
```

## Task 4: Controlled Match Tools Without Model Dependency

**Files:**
- Create: `backend/src/main/java/com/ntyqb/backend/assistant/MatchAssistantTools.java`
- Modify: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantService.java`
- Modify: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantDtos.java`
- Modify: `backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java`

- [ ] **Step 1: Add tests for deterministic tools path**

Append to `backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java`:

```java
@Test
void shouldListPendingConfirmationsThroughAssistantTools() throws Exception {
    String token = login("local-demo-user", "阿北", "https://example.com/avatar-demo.png");

    mockMvc.perform(post("/api/assistant/chat")
                    .header("X-Auth-Token", token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"message\":\"我有哪些待确认？\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reply").value("下面是你待确认的比赛。"))
            .andExpect(jsonPath("$.results").isArray());
}

@Test
void shouldListRecentBilliardsMatchesThroughAssistantTools() throws Exception {
    String token = login("local-demo-user", "阿北", "https://example.com/avatar-demo.png");

    mockMvc.perform(post("/api/assistant/chat")
                    .header("X-Auth-Token", token)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"message\":\"查我最近的台球记录\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.reply").value("下面是你最近的台球记录。"))
            .andExpect(jsonPath("$.results").isArray());
}
```

- [ ] **Step 2: Run backend tests to verify they fail**

Run:

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

Expected: the two new tests fail because the skeleton returns `记录助手暂未开启`.

- [ ] **Step 3: Create controlled tools class**

Create `backend/src/main/java/com/ntyqb/backend/assistant/MatchAssistantTools.java`:

```java
package com.ntyqb.backend.assistant;

import com.ntyqb.backend.dto.AuthDtos;
import com.ntyqb.backend.dto.MatchDtos;
import com.ntyqb.backend.entity.MatchStatus;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.service.MatchService;
import com.ntyqb.backend.service.UserService;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class MatchAssistantTools {

    private final MatchService matchService;
    private final UserService userService;

    public MatchAssistantTools(MatchService matchService, UserService userService) {
        this.matchService = matchService;
        this.userService = userService;
    }

    public List<AuthDtos.UserSummaryDto> searchUsers(String keyword, Long currentUserId) {
        return userService.searchUsers(keyword == null ? "" : keyword, currentUserId);
    }

    public List<AssistantDtos.ResultDto> listMyMatches(
            Long currentUserId,
            String scope,
            SportType sportType,
            MatchStatus status,
            int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 8));
        return matchService.listMatches(currentUserId, scope, sportType, status).items().stream()
                .limit(safeLimit)
                .map(this::toResult)
                .toList();
    }

    public List<AssistantDtos.ResultDto> listPendingConfirmations(Long currentUserId, int limit) {
        return listMyMatches(currentUserId, "pending_confirmation", null, MatchStatus.PENDING, limit);
    }

    private AssistantDtos.ResultDto toResult(MatchDtos.MatchDetailDto match) {
        String title = match.sportType() + " · " + match.status();
        String subtitle = match.participants().stream()
                .map(MatchDtos.MatchParticipantDto::nickname)
                .reduce((left, right) -> left + " / " + right)
                .orElse("比赛记录");
        return new AssistantDtos.ResultDto("MATCH", title, subtitle, match.id());
    }
}
```

- [ ] **Step 4: Use deterministic routing before model integration**

Modify `backend/src/main/java/com/ntyqb/backend/assistant/AssistantService.java` constructor to inject tools:

```java
private final MatchAssistantTools matchAssistantTools;
```

Constructor:

```java
public AssistantService(
        AssistantProperties properties,
        AssistantActionStore actionStore,
        MatchService matchService,
        MatchAssistantTools matchAssistantTools
) {
    this.properties = properties;
    this.actionStore = actionStore;
    this.matchService = matchService;
    this.matchAssistantTools = matchAssistantTools;
}
```

At the top of `chat(...)`, after `conversationId`, add:

```java
String message = request.message() == null ? "" : request.message().trim();
if (message.contains("待确认")) {
    return new AssistantDtos.ChatResponse(
            conversationId,
            "下面是你待确认的比赛。",
            null,
            matchAssistantTools.listPendingConfirmations(currentUser.getId(), 6)
    );
}
if (message.contains("台球") && (message.contains("最近") || message.contains("记录"))) {
    return new AssistantDtos.ChatResponse(
            conversationId,
            "下面是你最近的台球记录。",
            null,
            matchAssistantTools.listMyMatches(currentUser.getId(), "mine", SportType.BILLIARDS, null, 6)
    );
}
```

Add import:

```java
import com.ntyqb.backend.entity.SportType;
```

- [ ] **Step 5: Run backend tests**

Run:

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

Expected: all backend tests pass.

- [ ] **Step 6: Commit Task 4**

```bash
git add backend/src/main/java/com/ntyqb/backend/assistant backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java
git commit -m "feat: add assistant match tools"
```

## Task 5: AgentScope Java Integration

**Files:**
- Modify: `backend/pom.xml`
- Modify: `backend/src/main/java/com/ntyqb/backend/assistant/MatchAssistantTools.java`
- Create: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantPromptFactory.java`
- Modify: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantService.java`
- Modify: `backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java`

- [ ] **Step 1: Add AgentScope dependency**

Modify `backend/pom.xml` by adding the Spring Boot starter dependency in `<dependencies>`. The current AgentScope Java install docs list version `1.0.12` for `io.agentscope:agentscope-spring-boot-starter`.

```xml
<dependency>
    <groupId>io.agentscope</groupId>
    <artifactId>agentscope-spring-boot-starter</artifactId>
    <version>1.0.12</version>
</dependency>
```

Run:

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

Expected: Maven resolves AgentScope and existing tests still pass.

- [ ] **Step 2: Add prompt factory**

Create `backend/src/main/java/com/ntyqb/backend/assistant/AssistantPromptFactory.java`:

```java
package com.ntyqb.backend.assistant;

import org.springframework.stereotype.Component;

@Component
public class AssistantPromptFactory {

    public String systemPrompt() {
        return """
                你是“你挺有球呗”的记录助手，只帮助用户添加比赛记录、查询比赛记录、查看待确认记录。
                必须遵守：
                1. 不要编造球友。需要球友时先调用搜索工具。
                2. 创建比赛前只生成待确认草稿，不要直接写入。
                3. 信息缺失时继续追问。
                4. 台球和乒乓球只支持单打；羽毛球支持单打和双打。
                5. 比赛确认、拒绝、取消不由你自动执行。
                6. 回复要短，优先给下一步动作。
                """;
    }
}
```

- [ ] **Step 3: Annotate tools for AgentScope**

Modify `backend/src/main/java/com/ntyqb/backend/assistant/MatchAssistantTools.java`.

Add imports:

```java
import io.agentscope.core.tool.Tool;
import io.agentscope.core.tool.ToolParam;
```

Annotate `searchUsers`:

```java
@Tool(name = "search_users", description = "搜索当前用户可选择的球友")
public List<AuthDtos.UserSummaryDto> searchUsers(
        @ToolParam(name = "keyword", description = "球友昵称关键词") String keyword,
        Long currentUserId
) {
    return userService.searchUsers(keyword == null ? "" : keyword, currentUserId);
}
```

Annotate `listMyMatches`:

```java
@Tool(name = "list_my_matches", description = "查询当前用户的比赛记录")
public List<AssistantDtos.ResultDto> listMyMatches(
        Long currentUserId,
        @ToolParam(name = "scope", description = "mine、pending_confirmation 或 initiated") String scope,
        @ToolParam(name = "sportType", description = "BILLIARDS、BADMINTON、TABLE_TENNIS，可为空") SportType sportType,
        @ToolParam(name = "status", description = "PENDING、CONFIRMED、REJECTED、CANCELLED、EXPIRED，可为空") MatchStatus status,
        @ToolParam(name = "limit", description = "最多返回几条，1 到 8") int limit
) {
    int safeLimit = Math.max(1, Math.min(limit, 8));
    return matchService.listMatches(currentUserId, scope, sportType, status).items().stream()
            .limit(safeLimit)
            .map(this::toResult)
            .toList();
}
```

Annotate `listPendingConfirmations`:

```java
@Tool(name = "list_pending_confirmations", description = "查询当前用户待确认的比赛")
public List<AssistantDtos.ResultDto> listPendingConfirmations(
        Long currentUserId,
        @ToolParam(name = "limit", description = "最多返回几条，1 到 8") int limit
) {
    return listMyMatches(currentUserId, "pending_confirmation", null, MatchStatus.PENDING, limit);
}
```

`currentUserId` intentionally has no `@ToolParam`; the agent path will inject it through `ToolExecutionContext`.

- [ ] **Step 4: Wire AgentScope in service behind configuration**

Modify `AssistantService.chat(...)` so the deterministic routes remain first. After them:

```java
if (!properties.isModelConfigured()) {
    return new AssistantDtos.ChatResponse(
            conversationId,
            "记录助手暂未开启",
            null,
            List.of()
    );
}
```

Add imports:

```java
import io.agentscope.core.ReActAgent;
import io.agentscope.core.message.Msg;
import io.agentscope.core.model.DashScopeChatModel;
import io.agentscope.core.tool.Toolkit;
import io.agentscope.core.tool.ToolExecutionContext;
```

Inject `AssistantPromptFactory`:

```java
private final AssistantPromptFactory promptFactory;
```

Constructor parameter:

```java
AssistantPromptFactory promptFactory
```

Assignment:

```java
this.promptFactory = promptFactory;
```

Then create and call the AgentScope `ReActAgent`:

```java
Toolkit toolkit = new Toolkit();
toolkit.registerTool(matchAssistantTools);
ToolExecutionContext context = ToolExecutionContext.builder()
        .register(currentUser.getId())
        .build();
ReActAgent agent = ReActAgent.builder()
        .name("NtyqbAssistant")
        .sysPrompt(promptFactory.systemPrompt())
        .model(DashScopeChatModel.builder()
                .apiKey(properties.getApiKey())
                .modelName(properties.getModelName())
                .build())
        .toolkit(toolkit)
        .toolExecutionContext(context)
        .maxIters(6)
        .build();
Msg response = agent.call(Msg.builder().textContent(message).build()).block();
String reply = response == null || response.getTextContent() == null
        ? "刚刚没听清，可以换个说法再试一次"
        : response.getTextContent();
return new AssistantDtos.ChatResponse(conversationId, reply, null, List.of());
```

Keep all create-match writes behind `AssistantActionStore`; do not expose a direct write tool in this task.

- [ ] **Step 5: Run backend tests**

Run:

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

Expected: all backend tests pass with no `ASSISTANT_MODEL_API_KEY` set. The AgentScope code must not call the model when no key is configured.

- [ ] **Step 6: Commit Task 5**

```bash
git add backend/pom.xml backend/src/main/java/com/ntyqb/backend/assistant backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java
git commit -m "feat: wire agentscope assistant"
```

## Task 6: Create-Match Draft And Confirmation

**Files:**
- Modify: `backend/src/main/java/com/ntyqb/backend/assistant/MatchAssistantTools.java`
- Modify: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantService.java`
- Modify: `backend/src/main/java/com/ntyqb/backend/assistant/AssistantDtos.java`
- Modify: `backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java`

- [ ] **Step 1: Add create-draft integration test**

Append to `backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java`:

```java
@Test
void shouldCreateBilliardsDraftAndConfirmThroughAssistant() throws Exception {
    String demoToken = login("assistant-demo-user", "阿北", "https://example.com/avatar-demo.png");
    String zhouToken = login("assistant-user-zhou", "周周", "https://example.com/avatar-zhou.png");
    long demoUserId = currentUserId(demoToken);
    long zhouUserId = currentUserId(zhouToken);

    String draftBody = """
            {
              "message":"DRAFT_CREATE_BILLIARDS",
              "draft":{
                "sportType":"BILLIARDS",
                "format":"SINGLES",
                "winnerSide":"A",
                "participantIdsA":[%d],
                "participantIdsB":[%d],
                "winMarginBalls":3
              }
            }
            """.formatted(demoUserId, zhouUserId);

    String draftResponse = mockMvc.perform(post("/api/assistant/chat")
                    .header("X-Auth-Token", demoToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(draftBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pendingAction.type").value("CREATE_MATCH"))
            .andExpect(jsonPath("$.pendingAction.summary").value("台球 单打：阿北 vs 周周，阿北胜，净胜 3 球"))
            .andReturn()
            .getResponse()
            .getContentAsString();

    String actionId = objectMapper.readTree(draftResponse).path("pendingAction").path("id").asText();

    mockMvc.perform(post("/api/assistant/actions/" + actionId + "/confirm")
                    .header("X-Auth-Token", demoToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.match.status").value("PENDING"))
            .andExpect(jsonPath("$.match.detail.winMarginBalls").value(3));
}
```

- [ ] **Step 2: Run backend tests to verify failure**

Run:

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

Expected: compilation or test failure because `ChatRequest` does not contain `draft` and no draft branch exists.

- [ ] **Step 3: Extend ChatRequest**

Modify `AssistantDtos.ChatRequest`:

```java
public record ChatRequest(
        String conversationId,
        String message,
        MatchDtos.CreateMatchRequest draft
) {
}
```

- [ ] **Step 4: Add draft creation branch**

Modify `AssistantService.chat(...)` before deterministic query branches:

```java
if ("DRAFT_CREATE_BILLIARDS".equals(message) && request.draft() != null) {
    String summary = buildCreateMatchSummary(request.draft(), currentUser);
    String actionId = actionStore.putCreateMatch(currentUser.getId(), request.draft(), summary);
    return new AssistantDtos.ChatResponse(
            conversationId,
            "我识别到一场比赛记录，请确认后创建。",
            new AssistantDtos.PendingActionDto(actionId, "CREATE_MATCH", summary, Map.of(
                    "sportType", request.draft().sportType(),
                    "format", request.draft().format(),
                    "winnerSide", request.draft().winnerSide()
            )),
            List.of()
    );
}
```

Add imports:

```java
import com.ntyqb.backend.dto.MatchDtos;
import com.ntyqb.backend.entity.SportType;
import com.ntyqb.backend.entity.TeamSide;
import com.ntyqb.backend.repository.UserRepository;
import java.util.Map;
```

Inject `UserRepository`:

```java
private final UserRepository userRepository;
```

Constructor parameter:

```java
UserRepository userRepository
```

Add helper:

```java
private String buildCreateMatchSummary(MatchDtos.CreateMatchRequest draft, User currentUser) {
    if (draft.sportType() == SportType.BILLIARDS) {
        String opponentName = draft.participantIdsB().stream()
                .findFirst()
                .flatMap(userRepository::findById)
                .map(User::getNickname)
                .orElse("对手");
        String winnerName = draft.winnerSide() == TeamSide.A ? currentUser.getNickname() : opponentName;
        return "台球 单打：%s vs %s，%s胜，净胜 %d 球".formatted(
                currentUser.getNickname(),
                opponentName,
                winnerName,
                draft.winMarginBalls()
        );
    }
    return "比赛记录";
}
```

- [ ] **Step 5: Run backend tests**

Run:

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

Expected: all backend tests pass.

- [ ] **Step 6: Commit Task 6**

```bash
git add backend/src/main/java/com/ntyqb/backend/assistant backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java
git commit -m "feat: support assistant match drafts"
```

## Task 7: Final Verification And Cleanup

**Files:**
- Modify only files required by failing verification.

- [ ] **Step 1: Run frontend tests**

Run:

```bash
cd frontend
npm test
```

Expected: all frontend tests pass.

- [ ] **Step 2: Run backend tests**

Run:

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

Expected: all backend tests pass.

- [ ] **Step 3: Inspect git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only assistant-related frontend, backend, tests, and docs files are modified. Existing unrelated worktree changes remain untouched.

- [ ] **Step 4: Commit verification fixes if any**

If Step 1 or Step 2 required fixes:

```bash
git add frontend/miniprogram/pages/home/index.ts frontend/miniprogram/pages/home/index.js frontend/miniprogram/pages/home/index.wxml frontend/miniprogram/pages/home/index.wxss frontend/miniprogram/services/api.ts frontend/miniprogram/services/api.js frontend/miniprogram/types/models.ts frontend/tests/home-assistant.test.js backend/pom.xml backend/src/main/resources/application.yml backend/src/main/java/com/ntyqb/backend/NtyqbApplication.java backend/src/main/java/com/ntyqb/backend/assistant backend/src/test/java/com/ntyqb/backend/ApplicationApiTests.java
git commit -m "fix: polish assistant chat integration"
```

If no fixes were needed, do not create an empty commit.
