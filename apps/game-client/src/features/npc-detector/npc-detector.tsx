import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { WindowMaxHeightAction } from "@/components/draggable-window/window-max-height-action";
import { NpcsList } from "@/features/npc-detector/components/npcs-list";
import { useDetectorWindowNpcs } from "@/features/npc-detector/hooks/use-detector-window-npcs";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNpcTypeColors } from "@/features/settings/persistence/use-appearance-settings";

export const NpcDetector = () => {
  const { t } = useTranslation("npcDetector");
  const { npcTypeColors } = useNpcTypeColors();
  const open = useWindowsStore((state) => state["npc-detector"].open);

  const defaultWindowHeight = useWindowsStore(
    (state) => state["npc-detector"].size.height,
  );

  const storedMaxContentHeight = useWindowsStore(
    (state) => state["npc-detector"].maxContentHeight,
  );

  const setOpen = useWindowsStore((state) => state.setOpen);

  const setMaxContentHeight = useWindowsStore(
    (state) => state.setMaxContentHeight,
  );

  const clearNpcs = useNpcDetectorStore((state) => state.clearNpcs);
  const { npcs: filteredNpcs, settings } = useDetectorWindowNpcs();

  const [isMaxHeightAdjustmentArmed, setIsMaxHeightAdjustmentArmed] =
    useState(false);

  const resolvedMaxContentHeight =
    storedMaxContentHeight ?? defaultWindowHeight;

  const handleClose = () => {
    setOpen("npc-detector", false);
    clearNpcs();
  };

  return (
    <DraggableWindow
      isOpen={open && filteredNpcs.length > 0}
      id="npc-detector"
      title={t("window.title")}
      actions=<WindowMaxHeightAction
        currentMaxHeight={resolvedMaxContentHeight}
        isArmed={isMaxHeightAdjustmentArmed}
        onClick={() =>
          setIsMaxHeightAdjustmentArmed((currentValue) => !currentValue)
        }
      />
      onClose={handleClose}
      heightMode="auto-up-to-max"
      maxContentHeight={resolvedMaxContentHeight}
      isMaxHeightAdjustmentArmed={isMaxHeightAdjustmentArmed}
      onMaxHeightAdjustmentArmedChange={setIsMaxHeightAdjustmentArmed}
      onMaxContentHeightChange={(nextMaxContentHeight) =>
        setMaxContentHeight("npc-detector", nextMaxContentHeight)
      }
      resizable
      minHeight={82}
      maxHeight={600}
      minWidth={242}
    >
      <NpcsList
        detectorSettings={settings}
        npcTypeColors={npcTypeColors}
        npcs={filteredNpcs}
      />
    </DraggableWindow>
  );
};
