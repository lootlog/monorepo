import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { WindowMaxHeightAction } from "@/components/window-max-height-action";
import { NpcsList } from "@/features/npc-detector/components/npcs-list";
import { useCurrentGameAccountDetectorSettings } from "@/hooks/use-current-game-account-detector-settings";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { getNpcTypeByWt, type DetectorNpcType } from "@lootlog/types";
import { NpcType } from "@/hooks/api/use-npcs";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const NpcDetector = () => {
  const { t } = useTranslation("npcDetector");
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
  const { npcs, clearNpcs } = useNpcDetectorStore();
  const { settings } = useCurrentGameAccountDetectorSettings();
  const [isMaxHeightAdjustmentArmed, setIsMaxHeightAdjustmentArmed] =
    useState(false);
  const [resolvedMaxContentHeight, setResolvedMaxContentHeight] = useState(
    storedMaxContentHeight ?? defaultWindowHeight,
  );

  useEffect(() => {
    if (storedMaxContentHeight === undefined) {
      return;
    }

    setResolvedMaxContentHeight(storedMaxContentHeight);
  }, [storedMaxContentHeight]);

  const handleClose = () => {
    setOpen("npc-detector", false);
    clearNpcs();
  };

  const filteredNpcs = npcs.filter((npc) => {
    const npcType = getNpcTypeByWt(
      NpcType,
      npc.wt,
      npc.prof,
      npc.type,
    ) as DetectorNpcType;
    const settingsByNpcType = settings[npcType];
    return settingsByNpcType?.notifyWindow && settingsByNpcType?.detect;
  });

  return (
    <AnimatedWindow
      isOpen={open && filteredNpcs.length > 0}
      windowKey="npc-detector"
    >
      <DraggableWindow
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
        maxContentHeight={storedMaxContentHeight}
        isMaxHeightAdjustmentArmed={isMaxHeightAdjustmentArmed}
        onMaxHeightAdjustmentArmedChange={setIsMaxHeightAdjustmentArmed}
        onMaxContentHeightChange={(nextMaxContentHeight) =>
          setMaxContentHeight("npc-detector", nextMaxContentHeight)
        }
        onResolvedMaxContentHeightChange={setResolvedMaxContentHeight}
        resizable
        minHeight={82}
        maxHeight={600}
        minWidth={242}
      >
        <div className="ll:flex ll:flex-col ll:h-full ll:w-full ll:overflow-hidden">
          <NpcsList npcs={filteredNpcs} />
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
