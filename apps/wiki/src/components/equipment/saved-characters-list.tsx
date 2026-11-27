import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { EmptyNotice } from "@/components/common/empty-notice";
import { useSavedEquipmentSets } from "@/hooks/use-saved-equipment-sets";
import { t } from "@/i18n/messages";
import { SavedCharacterCard } from "./saved-character-card";

const GRID = "grid gap-4 lg:grid-cols-2 2xl:grid-cols-3";

export function SavedCharactersList() {
  const { sets, isPending, hasError, limit } = useSavedEquipmentSets();
  const listRef = useRef<HTMLDivElement>(null);

  if (isPending) {
    return (
      <div className={GRID}>
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (hasError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("savedSets.loadFailed")}
      </p>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <EmptyNotice>{t("savedSets.pageEmpty")}</EmptyNotice>
        <Button nativeButton={false} render={<Link to="/set" />}>
          {t("savedSets.openSetPage")}
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      tabIndex={-1}
      className="flex flex-col gap-3 outline-none"
    >
      {limit === undefined ? null : (
        <p className="text-sm text-muted-foreground tabular-nums">
          {t("savedSets.pageCount", { count: sets.length, limit })}
        </p>
      )}
      <div className={GRID}>
        {sets.map((set) => (
          <SavedCharacterCard
            key={set.id}
            saved={set}
            onDeleted={() => listRef.current?.focus()}
          />
        ))}
      </div>
    </div>
  );
}
