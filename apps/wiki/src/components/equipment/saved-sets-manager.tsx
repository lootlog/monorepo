import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Spinner } from "@lootlog/ui/components/spinner";
import { EmptyNotice } from "@/components/common/empty-notice";
import { useSavedEquipmentSets } from "@/hooks/use-saved-equipment-sets";
import { t } from "@/i18n/messages";
import { SavedSetRow } from "./saved-set-row";
import { SavedSetSaveForm } from "./saved-set-save-form";

export function SavedSetsManager({ onClose }: { onClose: () => void }) {
  const { sets, isPending, hasError, limit } = useSavedEquipmentSets();
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 pb-4 outline-none"
    >
      <SavedSetSaveForm count={sets.length} limit={limit} />
      {isPending ? (
        <Spinner className="mx-auto" />
      ) : hasError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("savedSets.loadFailed")}
        </p>
      ) : sets.length === 0 ? (
        <EmptyNotice>{t("savedSets.empty")}</EmptyNotice>
      ) : (
        <ul
          aria-label={t("savedSets.title")}
          className="flex flex-col divide-y divide-border"
        >
          {sets.map((set) => (
            <SavedSetRow
              key={set.id}
              saved={set}
              onLoad={onClose}
              onDeleted={() => rootRef.current?.focus()}
            />
          ))}
        </ul>
      )}
      <ChevronLink
        className="self-start text-sm"
        render={<Link to="/characters" onClick={onClose} />}
      >
        {t("savedSets.manage")}
      </ChevronLink>
    </div>
  );
}
