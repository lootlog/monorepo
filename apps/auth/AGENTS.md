# Auth rules

Read the root `PRODUCT.md`, `ARCHITECTURE.md`, and `SECURITY.md` before changing
this app. Also use the repository Better Auth skill for Better Auth work.

- Discord is the only supported sign-in provider. Do not add or document
  email/password sign-in without a new product decision.
- Preserve an internal Lootlog user identifier. New domain contracts should not
  use `discordId` as the universal user key.
- Auth owns users, sessions, provider connections, JWT/JWKS, and provider-token
  handling. Other services do not read the auth database.
- Preserve secure cross-subdomain cookie, origin, token, and session behavior.
- Treat provider tokens, session data, and account-recovery paths as secrets.

Before handoff, run the relevant Vitest files, `bun run --filter @lootlog/auth lint`,
and the app build or typecheck path used by CI. Add contract coverage for
session, token, or JWKS changes.
