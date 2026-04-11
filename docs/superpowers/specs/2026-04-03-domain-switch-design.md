# 小程序 API 域名切换设计

**日期：** 2026-04-03

## 目标

将小程序默认后端访问入口从 `http://39.102.100.241/api` 切换为 `https://niyoushashilia.cloud/api`，不改动接口路径、鉴权流程和后端运行方式。

## 当前状态

- 域名首页 `https://niyoushashilia.cloud/` 已可访问
- 域名接口 `https://niyoushashilia.cloud/api/...` 已能到达后端
- 后端当前仍运行在 `8080`，由前置 `nginx` 暴露对外访问
- 后端 CORS 目前是 `allowedOrigins("*")`，不会阻塞这次域名切换

## 方案

1. 修改小程序默认 API 基地址常量，统一使用正式 HTTPS 域名。
2. 保持本地开发方式不变，需要联调本地时再临时改回 `http://127.0.0.1:8080/api`。
3. 更新 README 中的联调、上线阻塞项和发布说明，避免继续引用旧 IP。

## 暂不纳入本次改动

- 后端 CORS 收紧
- 处理 `OPTIONS` 预检请求异常
- 真实微信登录替换 `mock` 登录
- 线上后端部署方式调整

## 验证方式

- 检索仓库内旧 IP 引用，确认默认访问入口已经更新
- 直接请求 `https://niyoushashilia.cloud/api/leaderboards?sportType=BILLIARDS`，确认域名链路可达后端
