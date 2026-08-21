# Web product context

Read the canonical [`PRODUCT.md`](../../PRODUCT.md) first. This file defines the
web app's local responsibilities.

## Purpose

The web app is the authenticated surface for personal history and Organization
operations. It turns data captured in the Game client into durable lists,
analysis, configuration, and coordination workflows.

## Responsibilities

- Personal battle, kill, notification, account, and appearance workflows.
- Organization loot, timers, reservations, events, documents, statistics,
  notifications, activity, and administration.
- Public battle links with explicit owner-controlled visibility.
- Responsive core workflows for mobile users.

## Constraints

- The app is client-rendered and is not SSR.
- Organization and personal contexts remain visibly distinct.
- Every derived view applies the same access policy as its source records.
- Missing or stale real-time state is explicit in the UI.
- Complex administration belongs here rather than in the Game client.
- User-facing copy is localized; Polish is the supported product language.
- Follow `apps/web/design-guideline.md` and the Operate mode in `DESIGN.md`.

## Current evidence

Routes currently cover personal dashboards and battle analysis plus Organization
loot, timers, reservations, events, documents, statistics, notifications,
activity, and settings. Target behavior and current implementation gaps are
tracked separately in `ARCHITECTURE.md`.
