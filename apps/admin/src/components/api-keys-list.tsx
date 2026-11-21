import type { AdminApiKey } from "@lootlog/client/auth";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { formatDate } from "@/lib/format";
import { text } from "@/lib/messages";
import { useUserAction } from "@/lib/use-user-action";

/** A User's API keys; removing one cuts off the integration that uses it. */
export function ApiKeysList({
  userId,
  apiKeys,
}: {
  userId: string;
  apiKeys: ReadonlyArray<AdminApiKey>;
}) {
  const { run } = useUserAction(userId);

  if (apiKeys.length === 0)
    return <p className="text-sm text-muted-foreground">{text.apiKeysEmpty}</p>;

  return (
    <ul className="flex flex-col divide-y divide-border">
      {apiKeys.map((key) => {
        const name = key.name || text.apiKeyUnnamed;

        return (
          <li
            key={key.id}
            className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
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
