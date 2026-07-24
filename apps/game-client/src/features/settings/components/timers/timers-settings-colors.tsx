import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";
import { useTimersStore, type CustomTimerColor } from "@/store/timers.store";
import { Plus } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { AddColorForm } from "./components/add-color-form";
import {
  alphaToHex,
  hexToAlpha,
  stripAlphaChannel,
  TAILWIND_TO_HEX,
  type ColorEditData,
} from "./components/color-utils";
import { HiddenColorsList } from "./components/hidden-colors-list";
import { TimerColorListItem } from "./components/timer-color-list-item";

type TimerColorSelection = {
  id: string;
  kind: "custom" | "default";
};

const getTimerColorEditData = (
  selection: TimerColorSelection,
  customColors: Record<string, CustomTimerColor>,
  defaultColorNames: Record<string, string>,
  overriddenDefaultColors: Record<
    string,
    { borderColor: string; backgroundColor: string }
  >,
): ColorEditData => {
  if (selection.kind === "custom") {
    const color = customColors[selection.id];
    if (color) {
      return {
        name: color.name,
        borderColor: color.borderColor,
        backgroundColor: stripAlphaChannel(color.backgroundColor),
        backgroundAlpha: hexToAlpha(color.backgroundColor),
      };
    }
  }

  const defaults = TAILWIND_TO_HEX[selection.id] ?? {
    border: "#3B82F6",
    background: "#3B82F633",
  };
  const overridden = overriddenDefaultColors[selection.id];
  return {
    name:
      defaultColorNames[selection.id] ??
      getDefaultColorName(selection.id) ??
      selection.id,
    borderColor: overridden?.borderColor ?? defaults.border,
    backgroundColor: stripAlphaChannel(
      overridden?.backgroundColor ?? defaults.background,
    ),
    backgroundAlpha: hexToAlpha(
      overridden?.backgroundColor ?? defaults.background,
    ),
  };
};

export const TimersSettingsColors: FC = () => {
  const {
    customColors,
    addCustomColor,
    updateCustomColor,
    deleteCustomColor,
    defaultColorNames,
    setDefaultColorName,
    overriddenDefaultColors,
    updateDefaultColor,
    resetDefaultColor,
    deleteDefaultColor,
    hiddenDefaultColors,
    restoreDefaultColor,
  } = useTimersStore();
  const { t } = useTranslation();
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const visibleDefaultColors = Object.keys(TIMERS_COLORS).filter(
    (colorId) => !hiddenDefaultColors.includes(colorId),
  );

  const getEditData = (selection: TimerColorSelection) =>
    getTimerColorEditData(
      selection,
      customColors,
      defaultColorNames,
      overriddenDefaultColors,
    );

  const commitAppearance = (
    selection: TimerColorSelection,
    data: ColorEditData,
  ) => {
    if (selection.kind === "custom") {
      const currentColor = customColors[selection.id];
      if (!currentColor) return;
      updateCustomColor(selection.id, {
        ...currentColor,
        borderColor: data.borderColor,
        backgroundColor: `${data.backgroundColor}${alphaToHex(
          data.backgroundAlpha,
        )}`,
      });
      return;
    }

    updateDefaultColor(
      selection.id,
      data.borderColor,
      `${data.backgroundColor}${alphaToHex(data.backgroundAlpha)}`,
    );
  };

  const commitName = (selection: TimerColorSelection, name: string) => {
    if (selection.kind === "custom") {
      const currentColor = customColors[selection.id];
      if (!currentColor) return;
      updateCustomColor(selection.id, { ...currentColor, name });
      return;
    }

    setDefaultColorName(selection.id, name);
  };

  const handleAddColor = (data: Omit<CustomTimerColor, "id">) => {
    addCustomColor({ id: `custom-${Date.now()}`, ...data });
    setOpenPopover(null);
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-3">
      <section className="ll:flex ll:flex-col ll:gap-1.5">
        <div className="ll:text-[10px] ll:font-semibold ll:uppercase ll:tracking-wide ll:text-gray-400">
          {t("settings.timers.colors.standardColorsTitle")}
        </div>
        <div
          id="timer-colors-list"
          className="ll:grid ll:grid-cols-2 ll:gap-1.5"
        >
          {visibleDefaultColors.map((colorId) => {
            const selection: TimerColorSelection = {
              id: colorId,
              kind: "default",
            };
            const overridden = overriddenDefaultColors[colorId];
            const editData = getEditData(selection);
            const persistedName = defaultColorNames[colorId];
            const isModified =
              overridden !== undefined ||
              (persistedName !== undefined &&
                persistedName !== getDefaultColorName(colorId));

            return (
              <TimerColorListItem
                key={colorId}
                color={overridden ? undefined : colorId}
                customBorderColor={overridden?.borderColor}
                customBackgroundColor={overridden?.backgroundColor}
                data={editData}
                isDefault
                isModified={isModified}
                itemKey={`default:${colorId}`}
                openPopover={openPopover}
                onOpenPopoverChange={setOpenPopover}
                onCommit={(data) => commitAppearance(selection, data)}
                onNameCommit={(name) => commitName(selection, name)}
                onReset={() => resetDefaultColor(colorId)}
                onDelete={() => deleteDefaultColor(colorId)}
              />
            );
          })}
        </div>
      </section>

      <section className="ll:flex ll:flex-col ll:gap-1.5">
        <div className="ll:flex ll:items-center ll:justify-between">
          <div className="ll:text-[10px] ll:font-semibold ll:uppercase ll:tracking-wide ll:text-gray-400">
            {t("settings.timers.colors.customColorsTitle")}
          </div>
          <Popover
            open={openPopover === "add"}
            onOpenChange={(open) => setOpenPopover(open ? "add" : null)}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="ll:size-7 ll:p-0"
                aria-label={t("settings.timers.colors.addTitle")}
              >
                <Plus className="ll:size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              role="dialog"
              align="end"
              className="ll:w-[min(340px,calc(100vw-16px))] ll:p-3"
            >
              <AddColorForm onAdd={handleAddColor} />
            </PopoverContent>
          </Popover>
        </div>

        {Object.keys(customColors).length > 0 ? (
          <div className="ll:grid ll:grid-cols-2 ll:gap-1.5">
            {Object.values(customColors).map((color) => {
              const selection: TimerColorSelection = {
                id: color.id,
                kind: "custom",
              };
              return (
                <TimerColorListItem
                  key={color.id}
                  customBorderColor={color.borderColor}
                  customBackgroundColor={color.backgroundColor}
                  data={getEditData(selection)}
                  isDefault={false}
                  isModified
                  itemKey={`custom:${color.id}`}
                  openPopover={openPopover}
                  onOpenPopoverChange={setOpenPopover}
                  onCommit={(data) => commitAppearance(selection, data)}
                  onNameCommit={(name) => commitName(selection, name)}
                  onReset={() => undefined}
                  onDelete={() => deleteCustomColor(color.id)}
                />
              );
            })}
          </div>
        ) : null}
      </section>

      <HiddenColorsList
        hiddenColors={hiddenDefaultColors}
        colorNames={defaultColorNames}
        onRestore={restoreDefaultColor}
      />
    </div>
  );
};
