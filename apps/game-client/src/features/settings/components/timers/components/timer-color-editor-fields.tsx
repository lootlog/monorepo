import { Input } from "@/components/ui/input";
import { SettingsSliderField } from "@/components/settings/settings-slider-field";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { alphaToHex, type ColorEditData } from "./color-utils";
import { TimerColorHexField } from "./timer-color-hex-field";
import { TimerColorPreviewChip } from "./timer-color-preview-chip";

type TimerColorEditorFieldsProps = {
  idPrefix: string;
  draft: ColorEditData;
  /** Live update for previews; nothing is persisted yet. */
  onDraftChange: (draft: ColorEditData) => void;
  /** Persist the draft once a field is done editing. */
  onCommit: (draft: ColorEditData) => void;
};

/**
 * Name, border, background, transparency and a live sample of one timer
 * colour. Shared by the editor of an existing colour and the add form.
 */
export const TimerColorEditorFields: FC<TimerColorEditorFieldsProps> = ({
  idPrefix,
  draft,
  onDraftChange,
  onCommit,
}) => {
  const { t } = useTranslation();

  const commitName = (name: string) => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      onDraftChange(draft);

      return;
    }

    onCommit({ ...draft, name: normalizedName });
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-3">
      <div className="ll:flex ll:flex-col ll:gap-1">
        <label
          htmlFor={`${idPrefix}-name`}
          className="ll:text-[11px] ll:text-muted-foreground"
        >
          {t("settings.timers.colors.nameLabel")}
        </label>
        <Input
          id={`${idPrefix}-name`}
          value={draft.name}
          placeholder={t("settings.timers.colors.namePlaceholder")}
          onChange={(event) =>
            onDraftChange({ ...draft, name: event.target.value })
          }
          onBlur={(event) => commitName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              commitName(event.currentTarget.value);
              event.currentTarget.blur();
            }
          }}
          className="ll:border-border ll:text-popover-foreground"
        />
      </div>

      <div className="ll:grid ll:grid-cols-2 ll:gap-2">
        <TimerColorHexField
          id={`${idPrefix}-border`}
          label={t("settings.timers.colors.borderLabel")}
          hexLabel={t("settings.timers.colors.borderHexAria")}
          value={draft.borderColor}
          onChange={(borderColor) => onDraftChange({ ...draft, borderColor })}
          onCommit={(borderColor) => onCommit({ ...draft, borderColor })}
        />
        <TimerColorHexField
          id={`${idPrefix}-background`}
          label={t("settings.timers.colors.backgroundLabel")}
          hexLabel={t("settings.timers.colors.backgroundHexAria")}
          value={draft.backgroundColor}
          onChange={(backgroundColor) =>
            onDraftChange({ ...draft, backgroundColor })
          }
          onCommit={(backgroundColor) =>
            onCommit({ ...draft, backgroundColor })
          }
        />
      </div>

      <div className="ll:flex ll:flex-col ll:gap-1">
        <span className="ll:text-[11px] ll:text-muted-foreground">
          {t("settings.timers.colors.transparencyLabel")}
        </span>
        <SettingsSliderField
          min={0}
          max={100}
          step={1}
          unit="%"
          value={draft.backgroundAlpha}
          aria-label={t("settings.timers.colors.transparencyAria")}
          onValueChange={(backgroundAlpha) =>
            onDraftChange({ ...draft, backgroundAlpha })
          }
          onCommit={(backgroundAlpha) =>
            onCommit({ ...draft, backgroundAlpha })
          }
        />
      </div>

      <div className="ll:flex ll:flex-col ll:gap-1.5">
        <span className="ll:text-xs ll:text-muted-foreground">
          {t("settings.timers.colors.previewLabel")}
        </span>
        <div className="ll:rounded-sm ll:bg-black/25 ll:p-2">
          <TimerColorPreviewChip
            borderColor={draft.borderColor}
            backgroundColor={`${draft.backgroundColor}${alphaToHex(
              draft.backgroundAlpha,
            )}`}
            fontSize={11}
            className="ll:w-full"
          />
        </div>
      </div>
    </div>
  );
};
