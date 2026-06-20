import { Button } from "@lootlog/ui/components/button";
import { Share2, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

type BattlesBulkActionsBarProps = {
  disabled: boolean;
  onClearSelection: () => void;
  onDelete: () => void;
  onShare: () => void;
  selectedCount: number;
};

export const BattlesBulkActionsBar = ({
  disabled,
  onClearSelection,
  onDelete,
  onShare,
  selectedCount,
}: BattlesBulkActionsBarProps) => {
  const { t } = useTranslation();

  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-1 duration-150">
      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <span
          aria-live="polite"
          className="inline-flex min-h-8 items-center rounded-md border border-border bg-card/70 px-2.5 text-xs font-medium text-muted-foreground"
        >
          {t("battlePanel.bulk.selected", {
            count: selectedCount,
          })}
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-center"
              onClick={onShare}
              disabled={disabled}
            >
              <Share2 className="size-3.5" aria-hidden="true" />
              {t("battlePanel.bulk.share")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-center"
              onClick={onClearSelection}
              disabled={disabled}
            >
              <X className="size-3.5" aria-hidden="true" />
              {t("battlePanel.bulk.clearSelection")}
            </Button>
          </div>
          <div className="border-t border-destructive/20 pt-2 sm:border-l sm:border-t-0 sm:pl-2 sm:pt-0">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="w-full justify-center sm:w-auto"
              onClick={onDelete}
              disabled={disabled}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t("battlePanel.bulk.delete")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
