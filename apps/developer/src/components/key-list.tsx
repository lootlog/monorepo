import { Empty, EmptyDescription } from "@lootlog/ui/components/empty";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import { useState } from "react";
import { KeyRow } from "@/components/key-row";
import type { ApiKey } from "@/lib/key-client";
import { portalText as t } from "@/lib/translations";

export function KeyList({
  keys,
  organizations,
  observedAt,
  refreshState,
  onRefresh,
}: {
  keys: readonly ApiKey[];
  organizations: readonly { readonly id: string; readonly name: string }[];
  observedAt: number;
  refreshState: "ready" | "loading" | "error";
  onRefresh: () => Promise<void>;
}) {
  const [initialKeyIds] = useState(() => new Set(keys.map((key) => key.id)));
  const refreshing = refreshState === "loading";

  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-labelledby="key-list-title"
    >
      <h2 id="key-list-title" className="text-base font-semibold">
        {t.yourKeys}
      </h2>
      <span role="status" className="sr-only">
        {refreshing ? t.loading : ""}
      </span>
      {refreshState === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{t.keyListRefreshFailed}</AlertDescription>
          <Button
            variant="outline"
            className="mt-3 w-fit"
            onClick={() => void onRefresh()}
          >
            {t.refreshList}
          </Button>
        </Alert>
      ) : (
        <div
          aria-busy={refreshing}
          className={`transition-opacity duration-300 ${refreshing ? "opacity-60" : ""}`}
        >
          {keys.length ? (
            <ul className="overflow-hidden rounded-xl border border-border bg-card">
              {keys.map((key) => (
                <KeyRow
                  key={key.id}
                  apiKey={key}
                  organizations={organizations}
                  observedAt={observedAt}
                  arrived={!initialKeyIds.has(key.id)}
                  onChange={onRefresh}
                />
              ))}
            </ul>
          ) : (
            <Empty className="rounded-xl border border-dashed border-border">
              <EmptyDescription>{t.empty}</EmptyDescription>
            </Empty>
          )}
        </div>
      )}
    </section>
  );
}
