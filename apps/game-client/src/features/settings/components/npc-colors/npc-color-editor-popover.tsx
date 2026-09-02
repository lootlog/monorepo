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
import { RotateCcw } from "lucide-react";
import { useRef, useState, type FC, type ReactElement } from "react";
import { useTranslation } from "react-i18next";

type NpcColorEditorPopoverProps = {
  children: ReactElement;
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
          <div className="ll:flex ll:items-start ll:justify-between ll:gap-2">
            <div>
              <div className="ll:text-sm ll:font-semibold ll:text-white">
                {t(`common:npcTypes.${npcType.toLowerCase()}`)}
              </div>
              <div className="ll:text-[10px] ll:text-gray-400">
                {saving
                  ? t("settings.npcColors.saving")
                  : colorDraft === defaultColor
                    ? t("settings.npcColors.default")
                    : t("settings.npcColors.overridden")}
              </div>
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
              className="ll:h-9 ll:w-12 ll:p-1"
              aria-label={t("settings.npcColors.picker")}
            />
            <Input
              value={hexDraft}
              onChange={(event) =>
                setHexDraft(event.target.value.toUpperCase())
              }
              onBlur={(event) => commitColor(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitColor(event.currentTarget.value);
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") rollbackAndClose();
              }}
              className="ll:w-28 ll:font-mono ll:uppercase"
              aria-label={t("settings.npcColors.hex")}
            />
          </div>

          <div className="ll:grid ll:gap-2">
            <div className="ll:text-[10px] ll:uppercase ll:tracking-wide ll:text-gray-400">
              {t("settings.npcColors.preview")}
            </div>
            <div className="ll:rounded-sm ll:bg-gray-500/25 ll:px-2 ll:py-1 ll:text-xs">
              <span className="ll:text-gray-400">[21:37] </span>
              <strong style={{ color: surfaceColors.text }}>
                {t(`common:npcTypes.${npcType.toLowerCase()}`)}
              </strong>
            </div>
            <div
              className="ll:rounded-sm ll:border ll:border-solid ll:px-2 ll:py-1 ll:text-xs ll:text-white"
              style={{
                borderColor: surfaceColors.border,
                backgroundColor: surfaceColors.background,
              }}
            >
              {t("settings.npcColors.notificationPreview")}
            </div>
            <div
              className="ll:rounded-sm ll:border ll:border-solid ll:px-2 ll:py-1 ll:text-xs ll:text-white"
              style={{
                borderColor: surfaceColors.border,
                backgroundColor: surfaceColors.background,
              }}
            >
              {t("settings.npcColors.detectorPreview")}
            </div>
          </div>

          <div className="ll:flex ll:justify-end ll:border-t ll:border-gray-500/30 ll:pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={colorDraft === defaultColor}
              className="ll:h-7 ll:gap-2 ll:px-2"
              onClick={() => {
                savedColor.current = defaultColor;
                setColorDraft(defaultColor);
                setHexDraft(defaultColor);
                onReset();
              }}
            >
              <RotateCcw className="ll:size-3" />
              {t("settings.npcColors.reset")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
