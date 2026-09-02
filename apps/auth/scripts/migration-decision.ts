import fs from "node:fs";

const decisionPath = new URL("../better-auth-migration.json", import.meta.url);

type MigrationDecision = {
  readonly version?: unknown;
  readonly approved?: unknown;
  readonly betterAuthVersion?: unknown;
  readonly identityStrategy?: unknown;
  readonly accountMigration?: {
    readonly providerId?: unknown;
    readonly issuer?: unknown;
  };
  readonly rollout?: { readonly mixedWritersAllowed?: unknown };
};

export function readApprovedMigrationDecision() {
  const decision = JSON.parse(
    fs.readFileSync(decisionPath, "utf8"),
  ) as MigrationDecision;

  if (
    decision.version !== 1 ||
    decision.approved !== true ||
    decision.betterAuthVersion !== "1.7.2" ||
    decision.identityStrategy !== "provider-id" ||
    decision.accountMigration?.providerId !== "discord" ||
    decision.accountMigration.issuer !== "local:oauth:discord" ||
    decision.rollout?.mixedWritersAllowed !== false
  ) {
    throw new Error(
      "The committed Better Auth 1.7 migration decision is missing or invalid.",
    );
  }

  return decision;
}
