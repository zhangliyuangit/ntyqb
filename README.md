# 你挺有球呗

朋友小圈子用的微信小程序，支持记录台球、羽毛球、乒乓球对战，包含微信登录、待确认机制、排行榜和我的战绩页。

## 目录结构

- `backend`: Java + Spring Boot 后端，使用 H2 文件数据库做本地持久化，内置种子数据
- `frontend`: 原生微信小程序 + TypeScript 前端，按前后端分离方式请求后端 API

## 后端启动

本地环境按仓库内实现使用 `Java 17 + Maven 3.8+`，代码结构兼容后续升级到 Java 21。

```bash
cd backend
mvn spring-boot:run
```

后端默认地址：

- API: `http://127.0.0.1:8080/api`
- H2 Console: `http://127.0.0.1:8080/h2-console`

默认配置见 [application.yml](/Users/zhangliyuan/codexprojects/ntyqb/backend/src/main/resources/application.yml)。

### 后端验证

```bash
cd backend
mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test
```

## 小程序启动

1. 用微信开发者工具打开目录 `frontend`
2. 在开发者工具中开启“不校验合法域名”
3. 当前默认联调后端地址为 `http://39.102.100.241/api`
4. 直接编译运行

如果你临时要切回本地后端，把 [app.ts](/Users/zhangliyuan/codexprojects/ntyqb/frontend/miniprogram/app.ts) 和 [api.ts](/Users/zhangliyuan/codexprojects/ntyqb/frontend/miniprogram/services/api.ts) 里的默认地址改回本地即可。

小程序当前默认使用 `mock` 登录模式：

- 冷启动会先进入独立的微信授权页
- 首次授权需要选择头像、填写昵称，再点击“微信授权进入”
- 后续重新登录会直接复用上次确认过的头像和昵称，不再重复填写
- 前端会按 `wx.login -> /api/auth/wechat/login -> /api/me` 顺序完成登录
- 后端继续使用固定 `mockUserKey=local-demo-user` 识别本地调试用户
- 登录后即可看到预置的球友、排行榜和待确认记录

## 已实现能力

- 微信登录 / 登出接口与前端登录态接入
- 台球单打、羽毛球单双打、乒乓球单打记录创建
- 发起后待对手确认生效，支持确认 / 拒绝 / 取消 / 过期状态
- 按球类排行榜，区分正式榜和暂不入榜
- 首页、排行榜、记录、我的四个 Tab 页
- 独立授权登录页和原生 TabBar 图标
- 我的页和球友详情页的球类统计与比赛记录

## 生产发布清单

下面这份清单按“把这个项目真正发出去”整理，优先级已经按实际推进顺序排好了。

### 1. 先准备账号和资质

- 申请并完成微信小程序主体注册、认证
- 明确小程序名称、简介、头像、服务类目、管理员
- 准备隐私政策、用户协议、客服联系信息
- 如果计划正式商用，提前确认主体是个人还是企业

### 2. 准备云资源

- 购买 1 台可公网访问的服务器，至少能跑 `Java 17 + Spring Boot`
- 购买 1 个域名，作为后端 API 域名，例如 `api.xxx.com`
- 给域名申请 SSL 证书，保证后端接口走 `HTTPS`
- 做域名解析，把域名指向服务器或反向代理入口
- 如果服务器部署在中国大陆，通常需要先完成 ICP 备案

### 3. 把后端从“本地调试模式”切到“生产模式”

这个仓库当前默认还是本地开发配置，上线前至少要改下面几项：

- 把 [application.yml](/Users/zhangliyuan/codexprojects/ntyqb/backend/src/main/resources/application.yml) 里的 `app.auth.mode` 从 `mock` 改成真实微信登录模式
- 把微信登录实现接到真实 `code2Session`，不要再依赖 `mockUserKey`
- 把数据库从 H2 文件库切到 MySQL 或 PostgreSQL
- 关闭 H2 Console：`spring.h2.console.enabled=false`
- 关闭启动种子数据：`app.seed.enabled=false`
- 收紧跨域配置，不要继续保留 `allowedOrigins("*")`
- 增加生产环境配置文件，例如 `application-prod.yml`
- 配置日志落盘、异常告警、数据库备份

### 4. 这个项目里需要直接改掉的发布阻塞项

- 前端请求地址现在写死在 [app.ts](/Users/zhangliyuan/codexprojects/ntyqb/frontend/miniprogram/app.ts) 和 [api.js](/Users/zhangliyuan/codexprojects/ntyqb/frontend/miniprogram/services/api.js) 里的 `http://127.0.0.1:8080/api`，上线前必须改成正式 `https` 域名
- 前端不能再依赖开发者工具里的“`不校验合法域名`”
- 后端当前 CORS 允许全部来源，配置在 [WebConfig.java](/Users/zhangliyuan/codexprojects/ntyqb/backend/src/main/java/com/ntyqb/backend/config/WebConfig.java)，上线前要改成你的正式小程序请求来源策略
- 当前登录流程是“开发期模拟微信资料 + mock 登录”，要改成真实微信登录闭环

### 5. 配置微信公众平台

- 在微信公众平台后台配置 `request` 合法域名
- 如果后面有文件上传、下载、WebSocket，再补充对应合法域名
- 配置小程序隐私保护指引
- 补齐类目、简介、头像、服务范围、客服信息
- 如果使用地图、手机号、支付等能力，再按需补充对应权限和配置

### 6. 发布前测试

- 准备至少 3 套环境：本地开发、预发布、正式生产
- 用体验版完整走一遍：登录、发起记录、对手确认、排行榜、我的页
- 检查所有网络请求是否都走正式 `HTTPS` 域名
- 检查 token 失效、接口报错、空数据、弱网场景
- 核对隐私政策入口、登录说明、用户数据处理说明
- 让 2 到 3 个真实用户用体验版试用

### 7. 微信提审和上线

- 在微信开发者工具上传代码
- 生成体验版，先给测试微信号试用
- 修完问题后提交审核
- 审核通过后再点发布
- 首次上线后重点盯登录、记录创建、确认流转、排行榜统计是否正常

### 8. 上线后建议补的运维能力

- 域名和 SSL 证书到期提醒
- 数据库自动备份
- 应用日志检索
- 服务监控和告警
- 版本发布记录
- 管理员人工处理异常战绩的后台能力

## 当前项目的上线 TODO

- [ ] 申请微信小程序主体并完成认证
- [ ] 购买服务器
- [ ] 购买域名
- [ ] 完成域名解析
- [ ] 申请并部署 SSL 证书
- [ ] 如果部署在中国大陆，完成 ICP 备案
- [ ] 部署 MySQL 或 PostgreSQL
- [ ] 增加 `application-prod.yml`
- [ ] 把后端从 `mock` 登录改成真实微信 `code2Session`
- [ ] 关闭 H2 Console
- [ ] 关闭种子数据
- [ ] 收紧 CORS
- [ ] 把前端 API 地址改成正式 `https` 域名
- [ ] 在微信公众平台配置合法域名
- [ ] 配置隐私保护指引
- [ ] 上传体验版并做真机测试
- [ ] 提交微信审核
- [ ] 审核通过后正式发布

## 我建议你的推进顺序

1. 先申请小程序主体、买服务器、买域名
2. 把后端切到生产配置，完成 HTTPS 和数据库迁移
3. 把登录从 `mock` 换成真实微信登录
4. 改前端正式 API 域名并接入微信后台合法域名
5. 走体验版联调
6. 提审并发布

## 参考资料

- 腾讯云个人实名认证指引：https://www.tencentcloud.com/zh/document/product/378/10495
- 腾讯云关于中国大陆资源与备案的说明示例：https://www.tencentcloud.com/document/product/627/11731
- 腾讯云关于自定义域名与 HTTPS 的说明示例：https://www.tencentcloud.com/document/product/1051/43983
- 微信小程序版本流转说明参考：https://cloud.tencent.com/developer/article/1173189
- 微信小程序合法域名与 HTTPS 配置参考：https://cloud.tencent.com/developer/article/1989933

## 说明

- 开发期数据来自 H2 本地数据库和启动种子数据，不依赖外部数据库
- 生产接入真实微信 `code2Session` 时，只需替换登录实现，不影响主要接口和页面结构
