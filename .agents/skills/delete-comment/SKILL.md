---
name: delete-comment
description: Classify the remaining code comments in a path, file issues for the hacks they excuse, move decision records into ADRs, delete them all, and lower the comment ratchet.
disable-model-invocation: true
---

# Delete comments

The codebase carries no prose comments. `lootlog-comments/no-comments` forbids
them, and `tools/oxlint/comments/baseline.json` lets each file keep only the
comments it had when the rule landed. This skill spends that budget down.

Argument: the path to clean (a workspace, a feature directory, or a file).
Without one, pick the workspace with the largest total in the baseline.

Tool directives (`oxlint-disable`, `@ts-expect-error`, `@vitest-environment`,
`/// <reference>`, `#__PURE__`, knip's `@alias`), userscript `==UserScript==`
headers, and the `SAFETY:` justifications that
`anti-slop/require-safety-comment-for-type-assertion` demands are not comments
to the rule. Leave them.

## Steps

1. **Inventory.** Write the chunks to a scratch directory outside the
   repository:

   ```bash
   bun .agents/skills/delete-comment/scripts/inventory.ts <scratch> <path>
   ```

   Each comment appears once, with its id (`#file:line`), its lines marked
   `>>`, and the code around it. Done when every chunk exists.

2. **Classify.** Give every id exactly one category from
   [`classification.md`](classification.md) and append it to
   `<scratch>/out/NNN.jsonl`. Over a few hundred comments, split the chunks
   across subagents by area and hand each the classification file; you own
   the merge. Done when every id in every chunk has one decision.

3. **Decision records → ADRs.** Group the D decisions by topic. For each
   topic, extend the ADR in `docs/adr` that already covers it, or add the next
   number in the existing format and list it in `docs/adr/README.md`. Each
   decision names its symbol and path and states the reason, not the comment's
   prose. Done when every D id is traceable to an ADR line.

4. **Excuses → issues.** One GitHub issue per E key in `lootlog/monorepo`,
   after searching open issues for the same hack
   (`gh issue list --search`). The body names the file and symbol, the hack,
   why it is wrong, and what the fix looks like. Done when every E key has an
   issue URL.

5. **Delete.** Collect `{ "file", "line" }` for every classified id into one
   JSON array and run:

   ```bash
   bun .agents/skills/delete-comment/scripts/delete-comments.ts <targets.json>
   ```

   It removes each comment (a whole line when the comment owns it, the
   surrounding `{}` for a JSX comment) and formats the touched files.

6. **Verify and lock in.** Run lint with `--fix` and then typecheck and tests
   for each touched workspace; a deleted comment can leave an empty block or a
   missing blank line that lint flags. Then:

   ```bash
   bun run comments:ratchet --update
   ```

   ```bash
   bun run knip
   ```

   Done when lint, typecheck, tests, knip, and `bun run comments:ratchet` all
   pass and `baseline.json` only shrank.

Report the counts per category, the ADRs touched, the issue URLs, and the
lines removed (`git diff --shortstat`).
