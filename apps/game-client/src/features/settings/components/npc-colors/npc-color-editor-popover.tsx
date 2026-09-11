import { SettingsSectionHeader } from "@/components/settings/settings-section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { deriveNpcSurfaceColors } from "@lootlog/domain/npc-appearance";
import {
  isHexAppearanceColor,
  type CombatNpcType,
} from "@lootlog/schema/npc-appearance";
import { useRef, useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NpcColorPreviewChip } from "./npc-color-preview-chip";

type NpcColorEditorPopoverProps = {
  children: ReactNode;
  color: string;
  defaultColor: string;
  npcType: CombatNpcType;
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
  const [colorDraft, setColorDraft] = useState(color);
  const [hexDraft, setHexDraft] = useState(color);
  const savedColor = useRef(color);
  const surfaceColors = deriveNpcSurfaceColors(colorDraft);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      savedColor.current = color;
    }

    setColorDraft(color);
    setHexDraft(color);
    onOpenChange(nextOpen);
  };

  const commitColor = (nextColor: string) => {
    if (!isHexAppearanceColor(nextColor)) {
      setColorDraft(savedColor.current);
      setHexDraft(savedColor.current);

      return;
    }

    const normalizedColor = nextColor.toUpperCase();
    savedColor.current = normalizedColor;
    setColorDraft(normalizedColor);
    setHexDraft(normalizedColor);
    onDraftChange(normalizedColor);
    onCommit(normalizedColor);
  };

  const rollbackAndClose = () => {
    setColorDraft(savedColor.current);
    setHexDraft(savedColor.current);
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
              title={t(`common:npcTypes.${npcType.toLowerCase()}`)}
            />
            <div className="ll:text-xs ll:text-muted-foreground">
              {saving
                ? t("settings.npcColors.saving")
                : colorDraft === defaultColor
                  ? t("settings.npcColors.default")
                  : t("settings.npcColors.overridden")}
            </div>
          </div>

          <div className="ll:flex ll:items-center ll:gap-2">
            <Input
              type="color"
              value={colorDraft}
              onChange={(event) => {
                const nextColor = event.target.value.toUpperCase();
                setColorDraft(nextColor);
                setHexDraft(nextColor);
                onDraftChange(nextColor);
              }}
              onBlur={() => commitColor(colorDraft)}
              className="ll:h-9 ll:w-12 ll:border-border ll:p-1 ll:text-popover-foreground"
              aria-label={t("settings.npcColors.picker")}
            />
            <Input
              value={hexDraft}
              onChange={(event) =>
                setHexDraft(event.target.value.toUpperCase())
              }
              onBlur={(event) => commitColor(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  commitColor(event.currentTarget.value);
                  event.currentTarget.blur();
                }

                if (event.key === "Escape") rollbackAndClose();
              }}
              className="ll:w-28 ll:border-border ll:font-mono ll:uppercase ll:text-popover-foreground"
              aria-label={t("settings.npcColors.hex")}
            />
          </div>

          <div className="ll:grid ll:gap-1.5">
            <div className="ll:text-xs ll:text-muted-foreground">
              {t("settings.npcColors.preview")}
            </div>
            <div className="ll:rounded-sm ll:bg-black/25 ll:px-2 ll:py-1.5 ll:text-[13px]">
              <span className="ll:text-muted-foreground">[21:37] </span>
              <strong style={{ color: surfaceColors.text }}>
                {t(`common:npcTypes.${npcType.toLowerCase()}`)}
              </strong>
            </div>
            <div className="ll:flex ll:flex-wrap ll:gap-1.5">
              <NpcColorPreviewChip color={colorDraft} className="ll:max-w-full">
                {t("settings.npcColors.notificationPreview")}
              </NpcColorPreviewChip>
              <NpcColorPreviewChip color={colorDraft} className="ll:max-w-full">
                {t("settings.npcColors.detectorPreview")}
              </NpcColorPreviewChip>
            </div>
          </div>

          <div className="ll:flex ll:justify-end ll:pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={colorDraft === defaultColor}
              onClick={() => {
                savedColor.current = defaultColor;
                setColorDraft(defaultColor);
                setHexDraft(defaultColor);
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
