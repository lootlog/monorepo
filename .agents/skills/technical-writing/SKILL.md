---
name: technical-writing
description: Write or revise technical documentation, ADRs, READMEs, PR titles and descriptions, changesets, release notes, issue briefs, and commit messages so engineers can understand them on the first read.
---

# Technical writing

Write for a tired engineer who needs the point quickly.

## Pick the document mode

- Tutorial: teach by producing visible results.
- How-to: give steps toward a concrete goal.
- Reference: state complete facts for lookup.
- Explanation: explain bounded context, rationale, and trade-offs.

Do not mix modes when separate linked documents would be clearer.

## Write

- Use the repository's real symbols, paths, flags, commands, and domain terms.
- Put conditions before actions. Write instructions as commands.
- Prefer active voice, plain words, and one main thought per sentence.
- Cut filler, vague attribution, promotional language, and claims without evidence.
- Use numbered lists for sequences and bullets for unordered items.
- Keep headings in sentence case.
- State expected output or observable success for procedural steps.
- Write PR titles, PR descriptions, and Changeset summaries in English.
- Follow Conventional Commits for commit messages.

Apply the `unslop` skill as the final editing pass. Preserve required legal, API, and domain terminology.
