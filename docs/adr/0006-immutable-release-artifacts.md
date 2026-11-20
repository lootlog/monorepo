# 0006. Releases promote immutable artifacts

Status: accepted

## Context

A rollback is performed under pressure. If it rebuilds code, it can produce a
different artifact from the one that ran before: dependencies resolve again,
the build environment has moved, and the result has never been deployed.

## Decision

Merging to `main` deploys the affected targets to development. Production is a
manual promotion of a chosen commit and requires environment approval.

Backend services ship as container images tagged with the commit
(`sha-<commit>`) and deploy through GitOps. Cloudflare targets build and
deploy in the approved run. The infrastructure repository records the image
references and Cloudflare deployment identifiers that make up production.

A rollback restores the previously recorded revision. It never rebuilds.

Application pull requests carry no release metadata. Only the public SDK is
versioned, through its own publication workflow.

## Consequences

- What runs in production is identified by a commit and can be restored
  exactly.
- A fix for a bad release is either a rollback or a new promotion, never an
  edit in place.
- Database migrations must stay compatible with the previous revision, since a
  rollback does not undo them.
