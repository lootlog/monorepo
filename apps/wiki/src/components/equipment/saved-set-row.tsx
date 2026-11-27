import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { UserEquipmentSetResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import { decodeEquipmentSet } from "@/lib/equipment-set";
import { savedSetSummary } from "@/lib/saved-set-summary";
import { SavedSetEditForm } from "./saved-set-edit-form";
import { SavedSetMenu } from "./saved-set-menu";

type SavedSetRowProps = {
  saved: UserEquipmentSetResponseDto;
  onLoad: () => void;
  onDeleted: () => void;
};

export function SavedSetRow({ saved, onLoad, onDeleted }: SavedSetRowProps) {
  const { replace } = useEquipmentSet();
  const [isEditing, setIsEditing] = useState(false);
  const actionsRef = useRef<HTMLButtonElement>(null);
  const stored = decodeEquipmentSet(saved.code);

  if (isEditing) {
    return (
      <li>
        <SavedSetEditForm
          saved={saved}
          onDone={() => {
            flushSync(() => setIsEditing(false));
            actionsRef.current?.focus();
          }}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{saved.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {saved.description === ""
            ? savedSetSummary(stored)
            : `${savedSetSummary(stored)} · ${saved.description}`}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={t("savedSets.loadNamed", { name: saved.name })}
        onClick={() => {
          replace(stored);
          onLoad();
        }}
      >
        {t("savedSets.load")}
      </Button>
      <SavedSetMenu
        saved={saved}
        triggerRef={actionsRef}
        onEdit={() => setIsEditing(true)}
        onDeleted={onDeleted}
      />
    </li>
  );
}
