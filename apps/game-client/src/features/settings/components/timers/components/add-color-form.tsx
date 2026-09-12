import { SettingsSectionHeader } from "@/components/settings/settings-section-header";
import { Button } from "@/components/ui/button";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { alphaToHex, type ColorEditData } from "./color-utils";
import { TimerColorEditorFields } from "./timer-color-editor-fields";

interface AddColorFormProps {
  onAdd: (data: {
    name: string;
    borderColor: string;
    backgroundColor: string;
  }) => void;
}

const EMPTY_DRAFT: ColorEditData = {
  name: "",
  borderColor: "#3B82F6",
  backgroundColor: "#3B82F6",
  backgroundAlpha: 20,
};

export const AddColorForm: FC<AddColorFormProps> = ({ onAdd }) => {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const { t } = useTranslation();
  const name = draft.name.trim();

  const handleAdd = () => {
    if (!name) return;

    onAdd({
      name,
      borderColor: draft.borderColor,
      backgroundColor: `${draft.backgroundColor}${alphaToHex(
        draft.backgroundAlpha,
      )}`,
    });
    setDraft(EMPTY_DRAFT);
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-3">
      <SettingsSectionHeader
        as="h4"
        className="ll:px-0"
        title={t("settings.timers.colors.addTitle")}
      />

      <TimerColorEditorFields
        idPrefix="add-color"
        draft={draft}
        onDraftChange={setDraft}
        onCommit={setDraft}
      />

      <div className="ll:flex ll:justify-end ll:pt-1">
        <Button size="sm" onClick={handleAdd} disabled={!name}>
          {t("settings.timers.colors.addButton")}
        </Button>
      </div>
    </div>
  );
};
