import type { AdminApiKey } from "@lootlog/schema/admin";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { EmptyState } from "@lootlog/ui/components/empty-state";
import { KeyRound } from "lucide-react";
import { formatDate } from "@/lib/format";
import { text } from "@/lib/messages";
import { useUserAction } from "@/lib/use-user-action";

export function ApiKeysList({
  userId,
  apiKeys,
}: {
  userId: string;
  apiKeys: ReadonlyArray<AdminApiKey>;
}) {
  const { run, pending } = useUserAction(userId);

  if (apiKeys.length === 0)
    return <EmptyState compact icon={KeyRound} title={text.apiKeysEmpty} />;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {apiKeys.map((key) => {
        const name = key.name || text.apiKeyUnnamed;

        const revoking =
          pending?.action === "revoke-api-key" && pending.keyId === key.id;

        return (
          <li
            key={key.id}
            aria-busy={revoking}
            className={`flex flex-col gap-3 py-3 transition-opacity duration-300 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between ${revoking ? "opacity-40" : ""}`}
          >
            <div className="grid min-w-0 gap-1">
              <p className="break-words text-sm font-medium">{name}</p>
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex gap-1">
                  <dt>{text.apiKeyStart}:</dt>
                  <dd className="font-mono">{key.start ?? "—"}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>{text.apiKeyCreated}:</dt>
                  <dd>{formatDate(key.createdAt)}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>{text.apiKeyExpires}:</dt>
                  <dd>
                    {key.expiresAt === null
                      ? text.apiKeyNever
                      : formatDate(key.expiresAt)}
                  </dd>
                </div>
              </dl>
            </div>
            <ConfirmDialog
              title={text.apiKeyConfirmTitle(name)}
              description={text.apiKeyConfirmDescription}
              confirmButtonLabel={text.apiKeyRevoke}
              cancelButtonLabel={text.cancel}
              disabled={pending !== undefined}
              onConfirm={() => run({ action: "revoke-api-key", keyId: key.id })}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-start md:self-auto"
                  aria-label={text.apiKeyRevokeLabel(name)}
                >
                  {text.apiKeyRevoke}
                </Button>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
