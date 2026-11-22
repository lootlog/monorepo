# Classifying a comment

Read each comment with the code around it. When five lines are not enough (a
file-level JSDoc, a claim about another module), open the file or search with
CodeGraph. Verify every S, E, and D before writing it down.

- **T — Tautology.** Restates what the code, a name, a type, or a test title
  already says: JSDoc paraphrasing a symbol or signature, field docs expanding
  the field name, section banners, Arrange/Act/Assert, narration of the next
  line, commented-out code.
- **S — Stale.** Names code, behaviour, files, tickets, or plans that no
  longer exist or no longer match the code.
- **E — Excuse.** Justifies a hack the code should not have: TODO, FIXME,
  "for now", "temporary", "workaround", "until X lands", a cast or lint escape
  explained away, a copy kept "in sync with" another, a guard for a case that
  "cannot happen", knowingly approximate behaviour.
- **D — Decision record.** An important, non-obvious *why* that a maintainer
  would otherwise break or undo: an external constraint (Margonem runtime,
  Discord, RabbitMQ, PostgreSQL, browser), an Organization-isolation or
  security rule, a durability or idempotency invariant, a measured
  performance choice, a compatibility contract, an ordering requirement, or a
  rejected alternative. It matters beyond its line.

Good prose is not evidence of D. The test: if this comment vanished, would
someone plausibly break something or redo a rejected design? If not, it is T.
A comment continued over several `//` lines takes one decision on its first
line; its continuation lines are T.

## Output

One JSON object per line in `out/NNN.jsonl`, in chunk order:

```json
{"id":"apps/web/src/a.ts:12","c":"T"}
{"id":"apps/web/src/a.ts:30","c":"S","why":"names removeLegacyTimer, which no longer exists"}
{"id":"apps/web/src/b.ts:7","c":"E","key":"tooltip-reflow-timeout","title":"Replace the fixed 50 ms timeout before re-measuring tooltips","body":"<where, the hack, why it is wrong, what a fix looks like>"}
{"id":"apps/web/src/c.ts:44","c":"D","topic":"loot-submission-idempotency","decision":"`submitLoot` keys retries by the client event id because the gateway redelivers after reconnect.","where":"apps/web/src/c.ts (submitLoot)"}
```

Reuse one `key` for every comment excusing the same hack, and a small set of
`topic` slugs for coherent decision areas.
