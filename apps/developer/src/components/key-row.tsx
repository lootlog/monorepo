import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDialog } from "@lootlog/ui/components/confirm-dialog";
import { useState } from "react";
import { KeyRenameDialog } from "~/components/key-rename-dialog";
import {
  getKeyErrorMessage,
  isApiKeyActive,
  keyRequest,
  type ApiKey,
} from "~/lib/key-client";
import { portalText as t } from "~/lib/translations";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "Europe/Warsaw",
});

export function KeyRow({
  apiKey,
  onChange,
  organizations,
  observedAt,
}: {
  apiKey: ApiKey;
  organizations: readonly { readonly id: string; readonly name: string }[];
  observedAt: number;
  onChange: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);

    try {
      await keyRequest(`/${encodeURIComponent(apiKey.id)}`, {
        method: "DELETE",
      });
      await onChange();
    } catch (error) {
      setError(getKeyErrorMessage(error));
      throw error;
    } finally {
      setPending(false);
    }
  }

  const expired = !isApiKeyActive(apiKey, observedAt);

  const scope = [
    ...apiKey.organizationIds.map(
      (id) => organizations.find((org) => org.id === id)?.name ?? id,
    ),
    ...(apiKey.personalData ? [t.personal] : []),
  ];

  return (
    <li
      aria-busy={pending}
      className="grid gap-4 border-b border-border px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_13rem_auto] md:items-center md:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{apiKey.name}</h3>
          <Badge variant={expired ? "outline" : "ready"}>
            {expired ? t.expired : t.active}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {t.created} {dateFormatter.format(new Date(apiKey.createdAt))}
        </p>
      </div>
      <dl className="grid min-w-0 gap-1 text-sm">
        <dt className="text-xs text-muted-foreground">{t.scope}</dt>
        <dd className="break-words">{scope.join(", ") || "—"}</dd>
      </dl>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm whitespace-nowrap">
        <div className="grid gap-1">
          <dt className="text-xs text-muted-foreground">{t.mode}</dt>
          <dd>{apiKey.mode === "read" ? t.read : t.readWrite}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-xs text-muted-foreground">{t.expires}</dt>
          <dd>
            {apiKey.expiresAt
              ? dateFormatter.format(new Date(apiKey.expiresAt))
              : t.never}
          </dd>
        </div>
      </dl>
      <div className="-mx-3 flex flex-wrap items-center gap-1 md:mx-0 md:justify-end">
        <KeyRenameDialog
          apiKey={apiKey}
          disabled={pending}
          onChange={onChange}
        />
        <ConfirmDialog
          disabled={pending}
          title={t.confirmRemoveTitle(apiKey.name)}
          description={error ? `${t.confirmRemove} ${error}` : t.confirmRemove}
          confirmButtonLabel={t.remove}
          cancelButtonLabel={t.cancel}
          onConfirm={remove}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="text-destructive hover:text-destructive"
              aria-label={`${t.remove}: ${apiKey.name}`}
            >
              {t.removeShort}
            </Button>
          }
        />
      </div>
    </li>
  );
}
