# 首页记录助手 Chat 浮层设计

## 背景

`你挺有球呗` 当前小程序的首页负责展示播报、我的胜率和最近比赛；比赛新增主要通过底部中间 `+` 拉起记录页的手动填写浮层。接入 AgentScope Java 后，希望用户可以用自然语言完成添加比赛记录、查询最近记录和查看待确认记录，同时不破坏现有手动记录流程。

## 目标

- 登录用户在首页首屏看到一个轻量的“记录助手”入口。
- 点击入口后，从首页底部拉起一个 chat 浮层，不跳转页面。
- 浮层支持对话式添加记录、查询记录、查询待确认记录。
- 未登录用户不展示入口，也不能打开浮层。
- 第一版保留现有手动填写作为稳定 fallback，Agent 只通过后端受控工具调用既有业务服务。

## 非目标

- 不新增第五个 Tab。
- 不替换底部中间 `+` 的手动记录能力。
- 第一版不做语音输入、图片识别、复杂多 Agent 编排或 RAG。
- 第一版不允许模型直接访问数据库或生成 SQL。
- 第一版不让 Agent 自动取消、拒绝或确认比赛，涉及状态变更的高风险动作先不开放或必须二次确认。

## 用户体验

### 首页入口

入口只在 `loggedIn === true` 时展示，位置在首页播报模块之后、我的胜率之前：

```text
播报
记录助手入口
我的胜率
最近比赛
```

入口形态为横向操作条，文案偏任务化：

```text
记录助手
一句话添加或查询球局              开始
```

入口不使用重营销样式，保持当前小程序的克制信息流质感。它应当明显可点，但不抢走“最近比赛”的主体阅读权重。

### Chat 浮层

点击入口后拉起底部浮层：

- 高度约 `78vh`，保留少量首页背景露出。
- 使用遮罩，点击遮罩或关闭按钮可收起。
- 拉起时隐藏或避让自定义 TabBar，避免底部输入框和 TabBar 重叠。
- 顶部区域展示标题 `记录助手`、简短说明和关闭按钮。
- 中间为消息流。
- 底部为固定输入区，包含输入框和发送按钮。

首次打开时展示快捷示例：

- `我今天台球赢了张三，净胜 3 球`
- `查我最近的台球记录`
- `我有哪些待确认？`

### 对话状态

第一版可用前端内存保存当前浮层会话，关闭浮层后可清空。后端接口支持可选 `conversationId`，为后续多轮上下文和持久会话留口子，但第一版不要求做长期历史记录。

### 添加记录流程

自然语言添加记录时，助手先解析并补齐信息。必要字段包括：

- 球类：台球、羽毛球、乒乓球。
- 赛制：单打或双打，仅羽毛球支持双打。
- 参赛者：我方和对方。
- 胜方。
- 分数或净胜球。
- 比赛时间，缺省为当前时间。

当信息不完整时，助手继续追问。例如“你赢了谁？”、“净胜几球？”。

当信息完整时，助手返回一个确认摘要，由用户点击确认后才真正创建比赛记录：

```text
台球 单打
你 vs 张三
你胜，净胜 3 球
时间：今天
```

确认后调用后端创建比赛，仍沿用现有 `MatchService.createMatch` 规则：创建后状态为 `PENDING`，对手需要确认后才进入正式统计。

### 查询记录流程

查询类问题直接返回摘要列表，支持：

- 最近比赛。
- 指定球类最近比赛。
- 待我确认。
- 我发起的待确认。

查询结果优先使用短文本摘要，必要时附带可跳转或可操作的 match id。第一版不在浮层内重做完整比赛卡片。

## 前端设计

### 文件范围

- `frontend/miniprogram/pages/home/index.wxml`
- `frontend/miniprogram/pages/home/index.wxss`
- `frontend/miniprogram/pages/home/index.ts`
- `frontend/miniprogram/pages/home/index.js`
- `frontend/miniprogram/services/api.ts`
- `frontend/miniprogram/services/api.js`
- `frontend/miniprogram/types/models.ts`

如果 chat 浮层代码在首页文件中变得臃肿，再拆出组件：

- `frontend/miniprogram/components/assistant-sheet/*`

### 首页状态

新增首页状态：

- `assistantVisible`
- `assistantMessages`
- `assistantInput`
- `assistantSending`
- `assistantSuggestions`
- `assistantDraftAction`

入口展示条件：

```ts
loggedIn && pageReady
```

未登录时不渲染入口，不响应任何 assistant 打开动作。

### API 封装

新增：

```ts
sendAssistantMessage(request)
confirmAssistantAction(actionId)
```

第一版接口建议：

```http
POST /api/assistant/chat
POST /api/assistant/actions/{actionId}/confirm
```

`/api/assistant/chat` 用于普通消息和工具查询；`/api/assistant/actions/{actionId}/confirm` 用于确认创建比赛等需要二次确认的动作。

## 后端设计

### 模块结构

新增包：

```text
backend/src/main/java/com/ntyqb/backend/assistant
```

建议类：

- `AssistantController`
- `AssistantService`
- `AssistantDtos`
- `MatchAssistantTools`
- `AssistantPromptFactory`
- `AssistantActionStore`

### AgentScope 接入

后端引入 AgentScope Java Spring Boot starter，并在配置中提供模型参数。模型和密钥通过环境变量配置，不写入代码或仓库。

建议配置：

```yaml
app:
  assistant:
    enabled: true
    model-provider: dashscope
    model-name: qwen-max
    api-key: ${ASSISTANT_MODEL_API_KEY:}
```

如果生产环境暂时不配置密钥，`AssistantController` 返回明确的不可用提示，首页入口可根据 `/api/me` 或 assistant capability 字段决定是否展示。

### 工具边界

`MatchAssistantTools` 只暴露受控工具：

- `searchUsers(keyword)`
- `createMatchDraft(...)`
- `listMyMatches(scope, sportType, status, limit)`
- `listPendingConfirmations(limit)`
- `getMatchDetail(matchId)`

其中 `createMatchDraft` 只生成待确认动作，不直接写库。真正写库由用户确认后，后端使用 `MatchService.createMatch` 完成。

工具内部必须复用现有服务：

- 用户查询复用 `UserService.searchUsers`
- 比赛创建复用 `MatchService.createMatch`
- 比赛查询复用 `MatchService.listMatches`

模型不能直接依赖 repository，也不能拼接 SQL。

### 鉴权

所有 assistant 接口必须登录。

- Controller 使用 `AuthService.requireCurrentUser()`。
- 当前用户 id 不进入用户 prompt，由后端工具上下文注入。
- 工具执行时按当前用户做权限过滤。

### 动作确认

对于创建比赛记录，后端返回 `pendingAction`：

```json
{
  "id": "action-id",
  "type": "CREATE_MATCH",
  "summary": "...",
  "payload": {
    "sportType": "BILLIARDS",
    "format": "SINGLES",
    "winnerSide": "A",
    "participantIdsA": [1],
    "participantIdsB": [2],
    "winMarginBalls": 3
  }
}
```

前端展示确认按钮。用户确认后调用确认接口，后端再次校验 payload，并调用 `MatchService.createMatch`。

`AssistantActionStore` 第一版可用内存 TTL 保存待确认动作，TTL 建议 10 分钟。单机部署下可满足当前项目形态；如果后续多实例部署，再改为数据库或缓存。

## 数据协议

### Chat 请求

```json
{
  "conversationId": "optional",
  "message": "我今天台球赢了张三，净胜 3 球"
}
```

### Chat 响应

```json
{
  "conversationId": "conversation-id",
  "reply": "我识别到一场台球记录，请确认：你今天赢了张三，净胜 3 球。",
  "messages": [],
  "pendingAction": null,
  "results": []
}
```

### 确认动作响应

```json
{
  "reply": "已发起比赛记录，等待对手确认后会进入正式统计。",
  "match": {}
}
```

## 错误处理

- 模型未配置：返回“记录助手暂未开启”。
- 模型调用失败：返回“刚刚没听清，可以换个说法再试一次”，并保留输入。
- 用户名匹配多个：让用户选择具体球友。
- 用户不存在：提示先让对方注册，或使用手动流程搜索。
- 比分不合法：复用 `MatchService` 校验错误，并转换成友好文案。
- 待确认动作过期：提示重新描述一次。

## 测试

### 后端

- Assistant 接口未登录返回 401。
- 模型未配置时返回可解释错误。
- 工具创建台球草稿成功。
- 用户确认草稿后创建 `PENDING` 比赛。
- 创建 payload 仍受 `MatchService` 校验约束。
- 查询最近比赛只返回当前用户可见记录。

### 前端

- 未登录首页不显示记录助手入口。
- 登录首页显示入口。
- 点击入口拉起浮层。
- 关闭浮层回到首页。
- 发送中禁用发送按钮。
- 返回 `pendingAction` 时展示确认按钮。

## 分阶段实现

### 第一阶段：前端入口和静态浮层

- 首页登录态展示入口。
- 点击拉起 chat 浮层。
- 支持本地示例消息和关闭交互。
- 不接真实后端。

### 第二阶段：后端 Assistant API 和 AgentScope

- 引入 AgentScope 依赖和模型配置。
- 新增 assistant controller/service/dto。
- 暴露查询类工具和 create draft 工具。
- 完成后端测试。

### 第三阶段：前后端联调

- 前端接入 `/api/assistant/chat`。
- 展示查询结果和 pending action。
- 确认创建比赛。
- 增加前端测试。

### 第四阶段：体验收敛

- 优化提示词。
- 增加用户名歧义选择。
- 根据真实使用补充快捷示例。
- 评估是否把 chat 浮层拆成独立组件。

## 开放问题

- 第一版模型供应商使用 DashScope 还是 OpenAI 兼容接口，需要根据线上可用密钥决定。
- 是否要在 `/api/me` 中返回 assistant 是否可用，决定首页入口是否展示。推荐增加 capability，避免模型未配置时入口可见但不可用。
- 待确认、确认比赛等状态变更动作是否进入第一版。推荐第一版只做查询和创建比赛，确认/拒绝仍走现有比赛卡片按钮。
