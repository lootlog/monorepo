---
name: context7
description: |
  Fetch up-to-date library documentation via Context7 API. Use proactively when:
  (1) Working with ANY external library (React, Next.js, Supabase, etc.)
  (2) User asks about library APIs, patterns, or best practices
  (3) Implementing features that rely on third-party packages
  (4) Debugging library-specific issues
  (5) Need current documentation beyond training data cutoff
  (6) AND MOST IMPORTANTLY, when you are installing dependencies, libraries, or frameworks you should ALWAYS check the docs to see what the latest versions are. Do not rely on outdated knowledge.
  Prefer current primary documentation over guessing library APIs or using outdated knowledge.
---

# Context7 Documentation Fetcher

Retrieve current library documentation via Context7 API.

The bundled script loads its configuration. Never open, print, copy, or search for API keys or other secret values. If the script reports missing configuration, report that fact without inspecting secret files.

## Workflow

### 1. Search for the library

```bash
python3 .agents/skills/context7/scripts/context7.py search "<library-name>"
```

Example:

```bash
python3 ~/.codex/skills/context7/scripts/context7.py search "next.js"
```

Returns library metadata including the `id` field needed for step 2.

### 2. Fetch documentation context

```bash
python3 .agents/skills/context7/scripts/context7.py context "<library-id>" "<query>"
```

Example:

```bash
python3 ~/.codex/skills/context7/scripts/context7.py context "/vercel/next.js" "app router middleware"
```

Options:

- `--type txt|md` - Output format (default: txt)
- `--tokens N` - Limit response tokens

## Quick Reference

| Task                 | Command                                                            |
| -------------------- | ------------------------------------------------------------------ |
| Find React docs      | `search "react"`                                                   |
| Get React hooks info | `context "/facebook/react" "useEffect cleanup"`                    |
| Find Supabase        | `search "supabase"`                                                |
| Get Supabase auth    | `context "/supabase/supabase" "authentication row level security"` |

## When to Use

- Before implementing version-sensitive library behavior
- When unsure about current API signatures
- For library version-specific behavior, using primary sources where available
- To verify best practices and patterns
