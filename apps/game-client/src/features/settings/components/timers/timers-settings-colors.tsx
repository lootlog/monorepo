import type { CustomTimerColor } from "@lootlog/schema/timer-settings";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsList } from "@/components/settings/settings-list";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";
import { useTimersStore } from "@/store/timers.store";
import { Plus } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { AddColorForm } from "./components/add-color-form";
import {
  alphaToHex,
  hexToAlpha,
  stripAlphaChannel,
  getTimerColorHex,
  type ColorEditData,
} from "./components/color-utils";
import { HiddenColorsList } from "./components/hidden-colors-list";
import { TimerColorListItem } from "./components/timer-color-list-item";

type TimerColorSelection = {
  id: string;
  kind: "custom" | "default";
};

const selectionKey = (selection: TimerColorSelection) =>
  `${selection.kind}:${selection.id}`;

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
        borderColor: color.borderColor.toUpperCase(),
        backgroundColor: stripAlphaChannel(color.backgroundColor).toUpperCase(),
        backgroundAlpha: hexToAlpha(color.backgroundColor),
      };
    }
  }

  const defaults = getTimerColorHex(selection.id) ?? {
    border: "#3B82F6",
    background: "#3B82F633",
  };

  const overridden = overriddenDefaultColors[selection.id];
  const borderColor = overridden?.borderColor ?? defaults.border;
  const backgroundColor = overridden?.backgroundColor ?? defaults.background;

  return {
    name:
      defaultColorNames[selection.id] ??
      getDefaultColorName(selection.id) ??
      selection.id,
    borderColor: borderColor.toUpperCase(),
    backgroundColor: stripAlphaChannel(backgroundColor).toUpperCase(),
    backgroundAlpha: hexToAlpha(backgroundColor),
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
    resetAllDefaultColors,
    deleteDefaultColor,
    hiddenDefaultColors,
    restoreDefaultColor,
  } = useTimersStore();

  const { t } = useTranslation();
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  /** Live values of the colour being edited; rows repaint before the save. */
  const [draft, setDraft] = useState<{
    key: string;
    data: ColorEditData;
  } | null>(null);

  const hiddenColorIds = new Set(hiddenDefaultColors);

  const visibleDefaultColors = Object.keys(TIMERS_COLORS).filter(
    (colorId) => !hiddenColorIds.has(colorId),
  );

  const isDefaultModified = (colorId: string) => {
    const persistedName = defaultColorNames[colorId];

    return (
      overriddenDefaultColors[colorId] !== undefined ||
      (persistedName !== undefined &&
        persistedName !== getDefaultColorName(colorId))
    );
  };

  const anyDefaultModified = Object.keys(TIMERS_COLORS).some(isDefaultModified);

  const getData = (selection: TimerColorSelection) => {
    const key = selectionKey(selection);

    return draft?.key === key
      ? draft.data
      : getTimerColorEditData(
          selection,
          customColors,
          defaultColorNames,
          overriddenDefaultColors,
        );
  };

  const commit = (selection: TimerColorSelection, data: ColorEditData) => {
    const backgroundColor = `${data.backgroundColor}${alphaToHex(
      data.backgroundAlpha,
    )}`;

    setDraft({ key: selectionKey(selection), data });

    if (selection.kind === "custom") {
      const currentColor = customColors[selection.id];

      if (!currentColor) return;

      updateCustomColor(selection.id, {
        ...currentColor,
        name: data.name,
        borderColor: data.borderColor,
        backgroundColor,
      });

      return;
    }

    const stored = getTimerColorEditData(
      selection,
      customColors,
      defaultColorNames,
      overriddenDefaultColors,
    );

    if (data.name !== stored.name) {
      setDefaultColorName(selection.id, data.name);
    }

    if (
      data.borderColor !== stored.borderColor ||
      data.backgroundColor !== stored.backgroundColor ||
      data.backgroundAlpha !== stored.backgroundAlpha
    ) {
      updateDefaultColor(selection.id, data.borderColor, backgroundColor);
    }
  };

  const setOpen = (selection: TimerColorSelection, open: boolean) => {
    setOpenPopover(open ? selectionKey(selection) : null);
    setDraft(null);
  };

  const handleAddColor = (data: Omit<CustomTimerColor, "id">) => {
    addCustomColor({ id: `custom-${Date.now()}`, ...data });
    setOpenPopover(null);
  };

  const renderItem = (selection: TimerColorSelection) => {
    const key = selectionKey(selection);
    const isDefault = selection.kind === "default";

    return (
      <TimerColorListItem
        key={key}
        itemKey={key}
        data={getData(selection)}
        isDefault={isDefault}
        isModified={isDefault ? isDefaultModified(selection.id) : true}
        open={openPopover === key}
        onOpenChange={(open) => setOpen(selection, open)}
        onDraftChange={(data) => setDraft({ key, data })}
        onCommit={(data) => commit(selection, data)}
        onReset={() => {
          setDraft(null);
          resetDefaultColor(selection.id);
        }}
        onDelete={() => {
          setDraft(null);

          if (isDefault) deleteDefaultColor(selection.id);
          else deleteCustomColor(selection.id);
        }}
      />
    );
  };

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="timer-colors-list"
        title={t("settings.timers.colors.standardColorsTitle")}
        description={t("settings.timers.colors.standardColorsDescription")}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!anyDefaultModified}
            title={t("settings.timers.colors.resetAllDescription")}
            onClick={() => {
              setDraft(null);
              resetAllDefaultColors();
            }}
          >
            {t("settings.timers.colors.resetAll")}
          </Button>
        }
      >
        <SettingsList>
          {visibleDefaultColors.map((colorId) =>
            renderItem({ id: colorId, kind: "default" }),
          )}
        </SettingsList>
        <HiddenColorsList
          hiddenColors={hiddenDefaultColors}
          colorNames={defaultColorNames}
          onRestore={restoreDefaultColor}
        />
      </SettingsSection>

      <SettingsSection
        title={t("settings.timers.colors.customColorsTitle")}
        description={t("settings.timers.colors.customColorsDescription")}
        actions={
          <Popover
            open={openPopover === "add"}
            onOpenChange={(open) => setOpenPopover(open ? "add" : null)}
          >
            <PopoverTrigger asChild>
              <SettingsIconButton label={t("settings.timers.colors.addTitle")}>
                <Plus />
              </SettingsIconButton>
            </PopoverTrigger>
            <PopoverContent
              role="dialog"
              align="end"
              className="ll:w-[min(360px,calc(100vw-16px))] ll:p-3"
            >
              <AddColorForm onAdd={handleAddColor} />
            </PopoverContent>
          </Popover>
        }
      >
        {Object.keys(customColors).length > 0 ? (
          <SettingsList>
            {Object.values(customColors).map((color) =>
              renderItem({ id: color.id, kind: "custom" }),
            )}
          </SettingsList>
        ) : (
          <p className="ll:m-0 ll:px-2 ll:text-xs ll:text-muted-foreground">
            {t("settings.timers.colors.customColorsEmpty")}
          </p>
        )}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
