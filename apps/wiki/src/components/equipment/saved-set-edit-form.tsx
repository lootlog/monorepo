import { type FormEvent, useId, useState } from "react";
import type { UserEquipmentSetResponseDto } from "@lootlog/client/main";
import {
  EQUIPMENT_SET_DESCRIPTION_MAX_LENGTH,
  EQUIPMENT_SET_NAME_MAX_LENGTH,
} from "@lootlog/schema/equipment-sets";
import { Button } from "@lootlog/ui/components/button";
import { ButtonLoadingContent } from "@lootlog/ui/components/button-loading-content";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Textarea } from "@lootlog/ui/components/textarea";
import { useSavedEquipmentSetMutations } from "@/hooks/use-saved-equipment-sets";
import { t } from "@/i18n/messages";

type SavedSetEditFormProps = {
  saved: UserEquipmentSetResponseDto;
  onDone: () => void;
};

export function SavedSetEditForm({ saved, onDone }: SavedSetEditFormProps) {
  const { update } = useSavedEquipmentSetMutations();
  const [name, setName] = useState(saved.name);
  const [description, setDescription] = useState(saved.description);
  const nameId = useId();
  const descriptionId = useId();
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      trimmedName === saved.name &&
      trimmedDescription === saved.description
    ) {
      return onDone();
    }

    if (trimmedName === "" || update.isPending) return;

    update.mutate(
      {
        pathParams: { setId: saved.id },
        data: { name: trimmedName, description: trimmedDescription },
      },
      { onSuccess: onDone },
    );
  };

  return (
    <form
      aria-label={t("savedSets.editTitle", { name: saved.name })}
      className="flex flex-col gap-3 py-2"
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onDone();
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>{t("savedSets.nameLabel")}</Label>
        <Input
          id={nameId}
          value={name}
          maxLength={EQUIPMENT_SET_NAME_MAX_LENGTH}
          autoFocus
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={descriptionId}>{t("savedSets.descriptionLabel")}</Label>
        <Textarea
          id={descriptionId}
          value={description}
          rows={3}
          maxLength={EQUIPMENT_SET_DESCRIPTION_MAX_LENGTH}
          placeholder={t("savedSets.descriptionPlaceholder")}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      {update.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("savedSets.saveFailed")}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("savedSets.cancel")}
        </Button>
        <Button type="submit" disabled={trimmedName === "" || update.isPending}>
          <ButtonLoadingContent loading={update.isPending}>
            {t("savedSets.editSave")}
          </ButtonLoadingContent>
        </Button>
      </div>
    </form>
  );
}
