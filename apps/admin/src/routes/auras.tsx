import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Option, Schema } from "effect";
import { AuraAccountForm } from "@/components/aura-account-form";
import { AuraGrants } from "@/components/aura-grants";
import type { AuraAction, AuraRefusal } from "@/lib/aura-action";
import { readGameAccountId } from "@/lib/margonem-account";
import { auraNoticeText, auraRefusalText, text } from "@/lib/messages";
import { getAuraGrants } from "@/server/character-auras";

type AurasSearch = {
  /** A pasted profile link until the loader replaces it with the account id. */
  account?: string | undefined;
  notice?: AuraAction["action"] | undefined;
  error?: AuraRefusal | "failed" | undefined;
};

const readAccount = Schema.decodeUnknownOption(
  Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(300)),
);

const readNotice = Schema.decodeUnknownOption(
  Schema.Literals(["grant", "grant-personal", "revoke"]) satisfies Schema.Codec<
    AuraAction["action"]
  >,
);

const readError = Schema.decodeUnknownOption(
  Schema.Literals(["forbidden", "no-player", "failed"]),
);

export const Route = createFileRoute("/auras")({
  validateSearch: (search: {
    account?: unknown;
    notice?: unknown;
    error?: unknown;
  }): AurasSearch => ({
    // Every key is returned even when empty, or a raw value would stay.
    account: Option.getOrUndefined(readAccount(search.account)),
    notice: Option.getOrUndefined(readNotice(search.notice)),
    error: Option.getOrUndefined(readError(search.error)),
  }),
  loaderDeps: ({ search }) => ({ account: search.account }),
  loader: async ({ deps }) => {
    if (deps.account === undefined) return { kind: "empty" as const };

    const gameAccountId = readGameAccountId(deps.account);

    if (gameAccountId === undefined) return { kind: "invalid" as const };

    // A pasted link leaves the address bar as the account it names.
    if (gameAccountId !== deps.account)
      throw redirect({
        to: "/auras",
        search: { account: gameAccountId },
        replace: true,
      });

    const grants = await getAuraGrants({ data: gameAccountId });

    return grants.status === "ok"
      ? { kind: "found" as const, gameAccountId, grants: grants.value }
      : { kind: "refused" as const, reason: grants.status };
  },
  component: AurasPage,
});

function AurasPage() {
  const result = Route.useLoaderData();
  const { account, notice, error } = Route.useSearch();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">{text.aurasHeading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {text.aurasDescription}
        </p>
      </div>
      <AuraAccountForm
        key={account}
        account={account}
        invalid={result.kind === "invalid"}
      />
      {notice ? (
        <Alert variant="ready" role="status">
          <AlertDescription>{auraNoticeText[notice]}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{auraRefusalText[error]}</AlertDescription>
        </Alert>
      ) : null}
      {result.kind === "found" ? (
        <AuraGrants
          gameAccountId={result.gameAccountId}
          grants={result.grants}
        />
      ) : null}
      {/* An action refused for the same reason has already said so. */}
      {result.kind === "refused" && error !== result.reason ? (
        <Alert variant="destructive">
          <AlertDescription>{auraRefusalText[result.reason]}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
