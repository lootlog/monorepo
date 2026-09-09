import { Empty, EmptyDescription } from "@lootlog/ui/components/empty";
import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import { KeyRow } from "~/components/key-row";
import type { ApiKey } from "~/lib/key-client";
import { portalText as t } from "~/lib/translations";

export function KeyList({
  keys,
  organizations,
  observedAt,
  refreshState,
  onRefresh,
}: {
  keys: ApiKey[];
  organizations: { id: string; name: string }[];
  observedAt: number;
  refreshState: "ready" | "loading" | "error";
  onRefresh: () => Promise<void>;
}) {
  return (
    <section
      className="min-w-0 flex flex-col gap-5"
      aria-labelledby="key-list-title"
    >
      <h2 id="key-list-title" className="text-lg font-semibold">
        {t.yourKeys}
      </h2>
      {refreshState === "error" && (
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
      )}
      {refreshState === "loading" && <p role="status">{t.loading}</p>}
      {refreshState === "ready" && (
        <>
          {!keys.length && (
            <Empty>
              <EmptyDescription>{t.empty}</EmptyDescription>
            </Empty>
          )}
          {keys.map((key) => (
            <KeyRow
              key={key.id}
              apiKey={key}
              organizations={organizations}
              observedAt={observedAt}
              onChange={onRefresh}
            />
          ))}
        </>
      )}
    </section>
  );
}
