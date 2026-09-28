---
name: deslop
description: Behavior-neutral cleanup of AI slop in the current branch's code diff, covering comment narration, defensive checks, type laundering, needless indirection, and style drift. Use before review or when asked to deslop a change; for prose, use `unslop`.
---

# Deslop

Clean only the current branch diff before review. Preserve behavior absolutely.

## Checklist

1. Scope the pass to the diff against the merge base with `origin/main`
   (`git diff $(git merge-base origin/main HEAD)`), including uncommitted
   changes you own. Never run a repo-wide cleanup, and leave unrelated user
   changes in the working tree untouched.
2. Inspect every changed hunk for:
   - comments a human maintainer would not write, including narration, syntax
     explanation, and prose that merely restates the code;
   - defensive checks or `try`/`catch` blocks that are abnormal for the
     surrounding module or protect only imagined states;
   - casts that launder types, especially `as any` and assertions whose
     required safety comment restates the cast instead of naming the guarantee.
     Oxlint's `anti-slop/no-chained-type-assertions` and
     `anti-slop/no-widen-then-assert` already reject `as unknown as T` and
     widen-then-assert flows;
   - redundant intermediate variables or one-use helpers that do not add domain
     meaning, reduce duplication, or simplify control flow;
   - `memo`, `useMemo`, or `useCallback` without a measured integration
     constraint, since React Compiler owns memoization;
   - source files that only re-export symbols;
   - compatibility shims, aliases, retries, and fallback branches without a
     named shipped contract and removal plan;
   - naming, control flow, imports, formatting, and other style that conflicts
     with the surrounding file.
3. Make no functional edits. If cleanup could change behavior, leave it alone
   and report it instead.
4. Fix a finding inline only when the cleanup is trivial and behavior-neutral.
   Otherwise note it for the author.
5. After edits, run lint and typecheck for every touched workspace.
6. Report the result in 1–3 sentences, including whether anything changed and
   any non-trivial item left for review.

Run deslop before the correctness review, never instead of it.
