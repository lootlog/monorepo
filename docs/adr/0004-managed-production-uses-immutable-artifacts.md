---
status: accepted
date: 2026-08-21
---

# Managed production uses immutable artifacts

## Context

Lootlog has two deployment families: container services managed through GitOps
and applications released on Cloudflare. Rebuilding the same version during a
promotion or rollback would make the deployed artifact depend on time and build
environment.

The repository also contains Docker Compose configuration for local
infrastructure. Treating it as a second supported production platform would add
testing, documentation, and support costs that the project does not currently
fund.

## Decision

Container services deploy through GitOps and ArgoCD. Cloudflare applications
deploy checksummed release artifacts. Production promotion and rollback reuse
an existing immutable artifact.

Docker Compose supports local development only. The open-source core may be
self-hosted, but self-hosting remains community-supported until Lootlog ships
and tests a dedicated distribution.

## Consequences

- A rollback selects an existing `prod-<semver>` image or checksummed artifact;
  it does not rebuild that version.
- Release automation must preserve the mapping between source version and
  artifact digest.
- Production documentation must not present Docker Compose as an equivalent
  deployment path.
- A supported self-hosted edition requires an explicit future decision and a
  tested release process.
