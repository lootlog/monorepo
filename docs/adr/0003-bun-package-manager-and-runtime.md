# ADR 0003: Bun package manager and server runtime

- Status: Accepted
- Date: 2026-09-01

## Context

The repository used pnpm for dependency installation and Node.js for backend
processes. This split duplicated runtime assumptions across local scripts, CI,
Dockerfiles, release helpers, and workspace builds. Backend tests also depended
on several runners even when they did not need a browser or Vite.

Cloudflare Workers and frontend build targets have platform-specific runtimes.
Changing their deployment runtime would add risk without simplifying the
backend.

## Decision

Pin Bun 1.4.0 as the repository package manager and the runtime for deployable
backend applications. Store the dependency graph in `bun.lock`, use Bun's
isolated linker, and declare native or lifecycle-script packages through
`trustedDependencies`. CI and release automation must use frozen Bun installs.

Use `bun:test` for backend applications and platform-independent packages.
Keep Vitest only where Vite, DOM, or existing replay benchmark support requires
it. Keep Cloudflare Workers and frontend deployment runtimes unchanged.

## Consequences

- Local, CI, and container installs share one lockfile and one command model.
- Packages may not rely on pnpm's virtual-store layout or undeclared transitive
  dependencies.
- Docker images can copy Bun's production dependency graph without installing
  pnpm or Node.js package-manager shims.
- Vite and Cloudflare remain explicit exceptions rather than implicit backend
  runtime dependencies.
