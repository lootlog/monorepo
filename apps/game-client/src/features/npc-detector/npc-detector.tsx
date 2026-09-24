import { ConnectionStatusStrip } from "@/components/connection-status-strip";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { IconButton } from "@/components/ui/icon-button";
import { WindowMaxHeightAction } from "@/components/draggable-window/window-max-height-action";
import { NpcsList } from "@/features/npc-detector/components/npcs-list";
import { useDetectorWindowNpcs } from "@/features/npc-detector/hooks/use-detector-window-npcs";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { ListX } from "lucide-react";
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

  // Closing only hides the window: detections stay until they leave the map,
  // the map changes or the player clears them, and the next detection
  // reopens the window with them.
  const handleClose = () => setOpen("npc-detector", false);

  return (
    <DraggableWindow
      isOpen={open && filteredNpcs.length > 0}
      id="npc-detector"
      title={t("window.title")}
      actions=<>
        <IconButton label={t("actions.clearAll")} onClick={clearNpcs}>
          <ListX size={14} aria-hidden="true" />
        </IconButton>
        <WindowMaxHeightAction
          currentMaxHeight={resolvedMaxContentHeight}
          isArmed={isMaxHeightAdjustmentArmed}
          onClick={() =>
            setIsMaxHeightAdjustmentArmed((currentValue) => !currentValue)
          }
        />
      </>
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
      {/* A grid, not a flex column: the list's scroll viewport needs the
          definite height of its grid area to stay within the window's max
          height while the status strip takes its own row above the list. */}
      <div className="ll:grid ll:max-h-[inherit] ll:grid-rows-[auto_minmax(0,1fr)]">
        <ConnectionStatusStrip hasData={filteredNpcs.length > 0} />
        <div className="ll:row-start-2 ll:min-h-0">
          <NpcsList
            detectorSettings={settings}
            npcTypeColors={npcTypeColors}
            npcs={filteredNpcs}
          />
        </div>
      </div>
    </DraggableWindow>
  );
};
