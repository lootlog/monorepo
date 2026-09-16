import { Button } from "@lootlog/ui/components/button";
import { useTranslation } from "react-i18next";
import type { LootListFreshness } from "./loot-list-reconciliation";

export function LootListSyncStatus({
  freshness,
  connected,
  onRetry,
}: {
  freshness: LootListFreshness;
  connected: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  if (connected && freshness === "current") return null;
  const message = connected ? freshness : "offline";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
      <span role="status">{t(`loots.list.sync.${message}`)}</span>
      {connected && freshness !== "refreshing" && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("loots.list.sync.retry")}
        </Button>
      )}
    </div>
  );
}
