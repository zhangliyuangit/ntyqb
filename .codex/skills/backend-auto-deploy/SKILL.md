---
name: backend-auto-deploy
description: Use when working in the ntyqb project and backend files changed under backend/. This skill makes Codex test, package, inspect the remote server at 39.102.100.241, upload the new Spring Boot jar, and restart the running backend safely.
---

# Backend Auto Deploy

Use this skill when you modify `backend/` in this repo and need to ship the change to the remote server.

## Scope

- Repo: `ntyqb`
- Backend dir: `backend/`
- Build tool: Maven
- Artifact: `backend/target/backend-0.0.1-SNAPSHOT.jar`
- Remote server: `39.102.100.241`
- Auth: password login supplied by the user

## Local workflow

1. If backend files changed, run:
   `mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 test`
2. If tests pass, build:
   `mvn -Dmaven.repo.local=/Users/zhangliyuan/codexprojects/ntyqb/.m2 package -DskipTests`
3. Never deploy if local backend compilation or tests fail.

## Remote inspection workflow

Before replacing anything on the server:

1. SSH into `39.102.100.241`.
2. Find how the backend is currently running.
   Check `ps -ef | grep java | grep backend`
   Check `systemctl list-units --type=service | grep -i ntyqb`
   Check likely app dirs such as `/root`, `/opt`, `/srv`, `/var/www`
3. Reuse the existing run strategy when possible.
   If the app is managed by `systemd`, replace the jar in place and restart the service.
   If the app is started with `nohup java -jar ...`, replace the jar and restart the process with the same command.
4. Do not kill unrelated Java processes.

## Deploy workflow

1. Upload the new jar to the same remote directory as the existing backend jar.
2. Preserve the existing filename if a service or script expects it.
3. Restart using the current process manager.
4. Verify with:
   `ps -ef | grep java | grep backend`
   and a quick health-style request such as:
   `curl http://127.0.0.1:8080/api/leaderboards?sportType=BILLIARDS`

## Safety rules

- Confirm the remote target path before overwriting the jar.
- Keep the previous jar until the new process starts successfully.
- If restart fails, restore the prior jar/process arrangement when possible.
- Mention if deployment could not be completed or if the restart path on the server was ambiguous.
