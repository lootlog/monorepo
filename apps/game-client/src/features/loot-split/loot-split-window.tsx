import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { WindowMaxHeightAction } from "@/components/draggable-window/window-max-height-action";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/contexts/socket-context";
import { useAccountEnabledFlag } from "@/features/settings/persistence/use-account-enabled-flag";
import { useWindowsStore } from "@/store/windows.store";
import { LootSplitSection } from "./loot-split-section";
import { lootSplitStore } from "./loot-split-store";

/**
 * "Podział łupów": every open or just closed group split the hero takes part
 * in, newest first. It opens on its own when a split starts, unless the
 * setting turns it off; closing it keeps it closed until the next split.
 */
export const LootSplitWindow = () => {
  const { t } = useTranslation("lootSplit");
  const { socket, connected, joined } = useSocket();

  const { state, now } = useSyncExternalStore(
    lootSplitStore.subscribe,
    lootSplitStore.getSnapshot,
  );

  const enabled = useAccountEnabledFlag("lootSplit").data?.enabled ?? false;
  const open = useWindowsStore((store) => store["loot-split"].open);
  const setOpen = useWindowsStore((store) => store.setOpen);

  const defaultHeight = useWindowsStore(
    (store) => store["loot-split"].size.height,
  );

  const storedMaxContentHeight = useWindowsStore(
    (store) => store["loot-split"].maxContentHeight,
  );

  const setMaxContentHeight = useWindowsStore(
    (store) => store.setMaxContentHeight,
  );

  const [isMaxHeightAdjustmentArmed, setIsMaxHeightAdjustmentArmed] =
    useState(false);

  // Without the gateway relaying choices, the window would show only the hero.
  const shared = Boolean(
    socket && connected && joined && socket.supportsLootSplit(),
  );

  const seenSplitIds = useRef(new Set<string>());
  const newestSplitId = state.splits.at(-1)?.id;

  useEffect(() => {
    if (!newestSplitId || seenSplitIds.current.has(newestSplitId)) return;

    seenSplitIds.current.add(newestSplitId);

    if (enabled && shared) setOpen("loot-split", true);
  }, [newestSplitId, enabled, shared, setOpen]);

  const splits = state.splits.toReversed();

  return (
    <DraggableWindow
      isOpen={enabled && open && splits.length > 0}
      id="loot-split"
      title={t("windowTitle")}
      actions=<WindowMaxHeightAction
        currentMaxHeight={storedMaxContentHeight ?? defaultHeight}
        isArmed={isMaxHeightAdjustmentArmed}
        onClick={() => setIsMaxHeightAdjustmentArmed((armed) => !armed)}
      />
      onClose={() => setOpen("loot-split", false)}
      heightMode="auto-up-to-max"
      maxContentHeight={storedMaxContentHeight ?? defaultHeight}
      isMaxHeightAdjustmentArmed={isMaxHeightAdjustmentArmed}
      onMaxHeightAdjustmentArmedChange={setIsMaxHeightAdjustmentArmed}
      onMaxContentHeightChange={(height) =>
        setMaxContentHeight("loot-split", height)
      }
      contentClassName="ll:-mx-1 ll:-mb-1"
      resizable
      minWidth={180}
      minHeight={64}
      maxHeight={640}
    >
      <ScrollArea
        orientation="both"
        className="ll:h-full ll:max-h-[inherit] ll:w-full"
      >
        <div className="ll:flex ll:w-max ll:min-w-full ll:flex-col ll:pb-1">
          {splits.map((split) => (
            <LootSplitSection
              key={split.id}
              split={split}
              heroId={state.heroId}
              isOwn={split.id === state.ownSplitId}
              now={now}
            />
          ))}
        </div>
      </ScrollArea>
    </DraggableWindow>
  );
};
