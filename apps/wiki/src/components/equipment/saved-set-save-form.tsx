import { type FormEvent, useId, useState } from "react";
import { Save } from "lucide-react";
import { EQUIPMENT_SET_NAME_MAX_LENGTH } from "@lootlog/schema/equipment-sets";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { Button } from "@lootlog/ui/components/button";
import { ButtonLoadingContent } from "@lootlog/ui/components/button-loading-content";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSavedEquipmentSetMutations } from "@/hooks/use-saved-equipment-sets";
import { t } from "@/i18n/messages";
import { encodeEquipmentSet } from "@/lib/equipment-set";

type SavedSetSaveFormProps = {
  count: number;
  limit: number | undefined;
};

export function SavedSetSaveForm({ count, limit }: SavedSetSaveFormProps) {
  const { set } = useEquipmentSet();
  const { create } = useSavedEquipmentSetMutations();
  const [name, setName] = useState("");
  const nameId = useId();
  const isFull = limit !== undefined && count >= limit;
  const trimmed = name.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (trimmed === "" || isFull || create.isPending) return;

    create.mutate(
      { data: { name: trimmed, code: encodeEquipmentSet(set) } },
      { onSuccess: () => setName("") },
    );
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={submit}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={nameId}>{t("savedSets.saveLabel")}</Label>
        {limit === undefined ? null : (
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("savedSets.count", { count, limit })}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          id={nameId}
          value={name}
          maxLength={EQUIPMENT_SET_NAME_MAX_LENGTH}
          placeholder={t("savedSets.namePlaceholder")}
          disabled={isFull}
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          type="submit"
          disabled={trimmed === "" || isFull || create.isPending}
        >
          <ButtonLoadingContent loading={create.isPending}>
            <Save aria-hidden="true" />
            {t("savedSets.save")}
          </ButtonLoadingContent>
        </Button>
      </div>
      {isFull ? (
        <p className="text-sm text-muted-foreground">
          {t("savedSets.limitReached", { limit })}
        </p>
      ) : create.error ? (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorStatus(create.error) === 409
            ? t("savedSets.limitReached", { limit: limit ?? count })
            : t("savedSets.saveFailed")}
        </p>
      ) : null}
    </form>
  );
}
