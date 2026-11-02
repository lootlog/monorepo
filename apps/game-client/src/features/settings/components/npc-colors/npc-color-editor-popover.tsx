import { SettingsSectionHeader } from "@/components/settings/settings-section-header";
import { SettingsColorHexField } from "@/components/settings/settings-color-hex-field";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { deriveNpcSurfaceColors } from "@lootlog/domain/npc-appearance";
import type { AppearanceNpcType } from "@lootlog/schema/npc-appearance";
import { useRef, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NpcColorPreviewChip } from "./npc-color-preview-chip";

type NpcColorEditorPopoverProps = {
  children: ReactNode;
  /** The live draft colour; edits come back through `onDraftChange`. */
  color: string;
  defaultColor: string;
  npcType: AppearanceNpcType;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (color: string) => void;
  onCommit: (color: string) => void;
  onReset: () => void;
};

export const NpcColorEditorPopover: FC<NpcColorEditorPopoverProps> = ({
  children,
  color,
  defaultColor,
  npcType,
  open,
  saving,
  onOpenChange,
  onDraftChange,
  onCommit,
  onReset,
}) => {
  const { t } = useTranslation();
  /** The stored colour that Escape restores. */
  const savedColor = useRef(color);
  const surfaceColors = deriveNpcSurfaceColors(color);
  const npcTypeLabel = t(`common:npcTypes.${npcType.toLowerCase()}`);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) savedColor.current = color;
    onOpenChange(nextOpen);
  };

  const commitColor = (nextColor: string) => {
    savedColor.current = nextColor;
    onDraftChange(nextColor);
    onCommit(nextColor);
  };

  const rollbackAndClose = () => {
    onDraftChange(savedColor.current);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        role="dialog"
        align="start"
        className="ll:w-[min(360px,calc(100vw-16px))] ll:p-3"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            rollbackAndClose();
          }
        }}
      >
        <div className="ll:flex ll:flex-col ll:gap-3">
          <div>
            <SettingsSectionHeader
              as="h4"
              className="ll:px-0"
              title={npcTypeLabel}
            />
            <div className="ll:text-xs ll:text-muted-foreground">
              {saving
                ? t("settings.npcColors.saving")
                : color === defaultColor
                  ? t("settings.npcColors.default")
                  : t("settings.npcColors.overridden")}
            </div>
          </div>

          <SettingsColorHexField
            label={t("settings.npcColors.picker")}
            showLabel={false}
            hexLabel={t("settings.npcColors.hex")}
            value={color}
            onChange={onDraftChange}
            onCommit={commitColor}
            className="ll:w-44"
          />

          <div className="ll:grid ll:gap-1.5">
            <div className="ll:text-xs ll:text-muted-foreground">
              {t("settings.npcColors.preview")}
            </div>
            <div className="ll:rounded-sm ll:bg-black/25 ll:px-2 ll:py-1.5 ll:text-[13px]">
              <span className="ll:text-muted-foreground">[21:37] </span>
              <strong style={{ color: surfaceColors.text }}>
                {npcTypeLabel}
              </strong>
            </div>
            <div className="ll:flex ll:flex-wrap ll:gap-1.5">
              <NpcColorPreviewChip color={color} className="ll:max-w-full">
                {t("settings.npcColors.notificationPreview")}
              </NpcColorPreviewChip>
              <NpcColorPreviewChip color={color} className="ll:max-w-full">
                {t("settings.npcColors.detectorPreview")}
              </NpcColorPreviewChip>
            </div>
          </div>

          <div className="ll:flex ll:justify-end ll:pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={color === defaultColor}
              onClick={() => {
                savedColor.current = defaultColor;
                onReset();
              }}
            >
              {t("settings.npcColors.reset")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
