# Domain Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the mini program's default backend base URL from the server IP to the备案 domain `https://niyoushashilia.cloud/api`.

**Architecture:** Keep the existing frontend request flow and backend deployment unchanged. Only replace default frontend constants and accompanying documentation so the production access entry moves from IP to domain without affecting API routes.

**Tech Stack:** WeChat mini program, TypeScript, JavaScript, Spring Boot, README documentation

---

### Task 1: Update mini program default API base URL

**Files:**
- Modify: `frontend/miniprogram/app.ts`
- Modify: `frontend/miniprogram/app.js`
- Modify: `frontend/miniprogram/services/api.ts`
- Modify: `frontend/miniprogram/services/api.js`

- [ ] **Step 1: Replace the default base URL constant in app bootstrap files**

Set `apiBaseUrl` to `https://niyoushashilia.cloud/api` in both runtime entry files.

- [ ] **Step 2: Replace the shared service fallback base URL**

Set `DEFAULT_API_BASE_URL` to `https://niyoushashilia.cloud/api` in both TypeScript and JavaScript service files.

- [ ] **Step 3: Verify the codebase no longer uses the old production IP in active frontend config**

Run: `rg -n "39\\.102\\.100\\.241|niyoushashilia\\.cloud" frontend README.md`

Expected: frontend defaults point at the domain, and any remaining IP mentions are documentation-only if intentionally preserved.

### Task 2: Update project documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the mini program startup section**

Document the new default API endpoint `https://niyoushashilia.cloud/api` and keep the local fallback guidance.

- [ ] **Step 2: Update release checklist wording**

Replace old IP-based wording with domain-based guidance so the deployment notes match the current production entrypoint.

- [ ] **Step 3: Verify the README references align with the shipped configuration**

Run: `rg -n "39\\.102\\.100\\.241|http://127\\.0\\.0\\.1:8080/api|https://niyoushashilia\\.cloud/api" README.md`

Expected: local development references remain only where intentional, and production references use the domain.

### Task 3: Validate live reachability

**Files:**
- External check only

- [ ] **Step 1: Confirm the domain root is reachable**

Run: `curl -I -L --max-time 15 https://niyoushashilia.cloud/`

Expected: `HTTP/2 200`

- [ ] **Step 2: Confirm the domain API reaches backend auth**

Run: `curl -i --max-time 15 'https://niyoushashilia.cloud/api/leaderboards?sportType=BILLIARDS'`

Expected: backend JSON response, currently `401` without login, which proves routing reaches the application
