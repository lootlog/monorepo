# Architecture decision records

Architecture decision records explain decisions that would otherwise be
surprising when reading the code or operating Lootlog. They preserve the
context, chosen option, and consequences after the original discussion is no
longer available.

## When to write an ADR

Write an ADR when a decision is:

- difficult or expensive to reverse;
- shared by multiple workspaces or services;
- a security, data ownership, compatibility, or deployment boundary;
- based on a real trade-off whose rationale is not obvious from the code.

Do not use an ADR for task progress, implementation checklists, ordinary code
style, or a choice that can be changed locally without affecting a contract.
Track active work in GitHub Issues and Milestones.

## Lifecycle

1. Copy [`template.md`](template.md) to the next zero-padded number.
2. Set its status to `proposed` while the decision is under review.
3. Change the status to `accepted` when the decision becomes authoritative.
4. Link the ADR from the affected architecture, issue, and pull request.
5. When the decision changes, create a new ADR and mark the old one
   `superseded`. Do not rewrite the original reasoning.

Allowed statuses are `proposed`, `accepted`, `deprecated`, and `superseded`.

## Index

- [ADR-0001: A Discord guild anchors one Lootlog organization](0001-discord-guild-anchors-organization.md)
- [ADR-0002: Discord roles map to Lootlog access policies](0002-discord-roles-map-to-access-policies.md)
- [ADR-0003: Each data domain has one writer](0003-single-writer-data-ownership.md)
- [ADR-0004: Managed production uses immutable artifacts](0004-managed-production-uses-immutable-artifacts.md)
