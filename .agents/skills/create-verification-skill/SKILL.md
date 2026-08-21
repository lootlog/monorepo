---
name: create-verification-skill
description: Create a project-local verification skill for one app that drives an existing running application or service through real user paths and captures durable evidence. Use when an app lacks a repeatable browser, HTTP, CLI, or integration verification workflow.
---

# Create a verification skill

Create `.agents/skills/verify-<app>/` for one application at a time.

## Interview the repository

Determine from code and configuration:

- the user-facing surface;
- the existing development command and expected URL, port, or socket;
- stable ways to drive it, preferring current browser, HTTP, CLI, or test harnesses;
- observable evidence and side effects;
- authentication, seed-data, environment, and isolation constraints.

Do not start the application. This repository assumes it already runs. Ask only for information that code, configuration, process state, and the visible application cannot provide.

## Generate

Use the client's available skill-creation mechanism. In Codex, use the system `skill-creator` initializer. When no initializer exists, create the same `SKILL.md` and optional `agents/openai.yaml` structure directly. The generated skill must contain:

- Doctor: a read-only check that confirms the expected instance and version are reachable.
- Drive: exact selectors, routes, commands, or requests from this repository.
- Evidence: the action, resulting UI or response, and relevant side effects.
- Cleanup: only resources created by the verification run. Never kill processes by name.
- Feature map: the top three to five user-facing flows, each with entry path and observable success.

Store temporary evidence in an ignored location. Do not commit screenshots, credentials, tokens, or personal data.

## Prove the skill

Validate the skill folder, run Doctor, drive one mapped feature against the existing instance, capture evidence, and execute cleanup. A generated skill that has not completed this loop is a draft.
