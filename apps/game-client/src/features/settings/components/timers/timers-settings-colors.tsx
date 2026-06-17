import { SettingsSection } from "@/components/settings/settings-section";
import { useTimersStore, type CustomTimerColor } from "@/store/timers.store";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { getDefaultColorName } from "@/features/timers/utils/get-default-color-name";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { DefaultColorItem } from "./components/default-color-item";
import { CustomColorItem } from "./components/custom-color-item";
import { AddColorForm } from "./components/add-color-form";
import { HiddenColorsList } from "./components/hidden-colors-list";
import {
  stripAlphaChannel,
  alphaToHex,
  hexToAlpha,
  TAILWIND_TO_HEX,
  type ColorEditData,
} from "./components/color-utils";

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
    deleteDefaultColor,
    hiddenDefaultColors,
    restoreDefaultColor,
  } = useTimersStore();

  const [editingDefaultColor, setEditingDefaultColor] = useState<string | null>(
    null,
  );
  const [editingDefaultColorData, setEditingDefaultColorData] =
    useState<ColorEditData | null>(null);
  const [editingCustomColor, setEditingCustomColor] = useState<string | null>(
    null,
  );
  const [editingCustomColorData, setEditingCustomColorData] =
    useState<ColorEditData | null>(null);

  const handleAddColor = (data: {
    name: string;
    borderColor: string;
    backgroundColor: string;
  }) => {
    const newColor: CustomTimerColor = {
      id: `custom-${Date.now()}`,
      ...data,
    };
    addCustomColor(newColor);
  };

  const handleEditDefaultColor = (colorId: string) => {
    const overridden = overriddenDefaultColors[colorId];
    const defaultColors = TAILWIND_TO_HEX[colorId] ?? {
      border: "#3b82f6",
      background: "#3b82f620",
    };

    const bgColor = overridden?.backgroundColor ?? defaultColors.background;

    setEditingDefaultColor(colorId);
    setEditingDefaultColorData({
      name: defaultColorNames[colorId] ?? getDefaultColorName(colorId) ?? "",
      borderColor: overridden?.borderColor ?? defaultColors.border,
      backgroundColor: stripAlphaChannel(bgColor),
      backgroundAlpha: hexToAlpha(bgColor),
    });
  };

  const handleSaveDefaultColor = (colorId: string) => {
    if (editingDefaultColorData) {
      setDefaultColorName(colorId, editingDefaultColorData.name.trim());
      updateDefaultColor(
        colorId,
        editingDefaultColorData.borderColor,
        `${editingDefaultColorData.backgroundColor}${alphaToHex(editingDefaultColorData.backgroundAlpha)}`,
      );
    }
    setEditingDefaultColor(null);
    setEditingDefaultColorData(null);
  };

  const handleCancelEditDefaultColor = () => {
    setEditingDefaultColor(null);
    setEditingDefaultColorData(null);
  };

  const handleEditCustomColor = (color: CustomTimerColor) => {
    setEditingCustomColor(color.id);
    setEditingCustomColorData({
      name: color.name,
      borderColor: color.borderColor,
      backgroundColor: stripAlphaChannel(color.backgroundColor),
      backgroundAlpha: hexToAlpha(color.backgroundColor),
    });
  };

  const handleSaveCustomColor = (colorId: string) => {
    if (editingCustomColorData && editingCustomColorData.name.trim()) {
      updateCustomColor(colorId, {
        id: colorId,
        name: editingCustomColorData.name.trim(),
        borderColor: editingCustomColorData.borderColor,
        backgroundColor: `${editingCustomColorData.backgroundColor}${alphaToHex(editingCustomColorData.backgroundAlpha)}`,
      });
    }
    setEditingCustomColor(null);
    setEditingCustomColorData(null);
  };

  const handleCancelEditCustomColor = () => {
    setEditingCustomColor(null);
    setEditingCustomColorData(null);
  };

  const visibleDefaultColors = Object.entries(TIMERS_COLORS).filter(
    ([colorId]) => !hiddenDefaultColors.includes(colorId),
  );
  const { t } = useTranslation();

  return (
    <div className="ll:flex ll:flex-col ll:gap-3">
      <SettingsSection
        title={t("settings.timers.colors.listTitle")}
        titleClassName="ll:text-sm ll:font-semibold ll:text-white ll:normal-case"
      >
        <div className="ll:grid ll:grid-cols-2 ll:gap-1.5">
          {visibleDefaultColors.map(([colorId]) => (
            <DefaultColorItem
              key={colorId}
              colorId={colorId}
              displayName={defaultColorNames[colorId]}
              overridden={overriddenDefaultColors[colorId]}
              isEditing={editingDefaultColor === colorId}
              editData={editingDefaultColorData}
              onEdit={() => handleEditDefaultColor(colorId)}
              onSave={() => handleSaveDefaultColor(colorId)}
              onCancel={handleCancelEditDefaultColor}
              onDelete={() => deleteDefaultColor(colorId)}
              onEditDataChange={setEditingDefaultColorData}
            />
          ))}

          {Object.values(customColors).map((color) => (
            <CustomColorItem
              key={color.id}
              color={color}
              isEditing={editingCustomColor === color.id}
              editData={editingCustomColorData}
              onEdit={() => handleEditCustomColor(color)}
              onSave={() => handleSaveCustomColor(color.id)}
              onCancel={handleCancelEditCustomColor}
              onDelete={() => deleteCustomColor(color.id)}
              onEditDataChange={setEditingCustomColorData}
            />
          ))}
        </div>
      </SettingsSection>

      <AddColorForm onAdd={handleAddColor} />

      <HiddenColorsList
        hiddenColors={hiddenDefaultColors}
        colorNames={defaultColorNames}
        onRestore={restoreDefaultColor}
      />
    </div>
  );
};
