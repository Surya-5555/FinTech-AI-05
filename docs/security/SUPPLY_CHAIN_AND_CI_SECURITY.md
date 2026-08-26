# Supply Chain and CI Security

## 1. Dependency Management
- Lockfiles (`pnpm-lock.yaml`) must be committed and verified.
- Use `pnpm audit` in CI to detect vulnerable dependencies before merging to main.

## 2. GitHub Actions Secrets
- Secrets must never be printed to stdout/stderr.
- Avoid passing secrets via CLI arguments when possible; use environment variables mapped directly to the GitHub Action secrets context.
- Never use `pull_request_target` triggers for workflows that execute untrusted code or build untrusted dependencies.

## 3. Container Hardening
- Dockerfiles must use minimal base images (e.g., `alpine`).
- Run processes as non-root users inside the container where possible.
- `.dockerignore` has been hardened to prevent leaking `.env` files into the build context. Only template files (`*.env.example`) are permitted.

## 4. Source Control Policies
- Branch protection must be enforced on `main`.
- Direct pushes to `main` are currently permitted by the agent for rapid prototyping, but all commits must be atomic and semantic.
- Do not commit scratch files, debug logs, audit reports, or test benchmark data.
