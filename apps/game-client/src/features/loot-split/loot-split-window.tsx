import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { ConnectionStatusStrip } from "@/components/connection-status-strip";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { WindowMaxHeightAction } from "@/components/draggable-window/window-max-height-action";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAccountEnabledFlag } from "@/lib/settings-persistence/use-account-enabled-flag";
import { useWindowsStore } from "@/store/windows.store";
import { splitDropsRarity } from "./loot-split-model";
import { LootSplitSection } from "./loot-split-section";
import { lootSplitStore } from "./loot-split-store";
import { useLootSplitSocket } from "./use-loot-split-socket";

export const LootSplitWindow = () => {
  const { t } = useTranslation("lootSplit");

  const { state, now } = useSyncExternalStore(
    lootSplitStore.subscribe,
    lootSplitStore.getSnapshot,
  );

  const preferences = useAccountEnabledFlag("lootSplit").data;
  const enabled = preferences?.enabled ?? false;
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

  const shared = useLootSplitSocket() !== null;

  const seenSplitIds = useRef(new Set<string>());

  const splits = state.splits
    .filter((split) => splitDropsRarity(split, preferences?.rarities ?? []))
    .toReversed();

  const newestSplitId = splits[0]?.id;

  useEffect(() => {
    if (
      !newestSplitId ||
      !enabled ||
      !shared ||
      seenSplitIds.current.has(newestSplitId)
    )
      return;

    seenSplitIds.current.add(newestSplitId);
    setOpen("loot-split", true);
  }, [newestSplitId, enabled, shared, setOpen]);

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
      widthMode="content"
      minWidth={220}
      minHeight={64}
      maxHeight={640}
    >
      <div className="ll:flex ll:h-full ll:max-h-[inherit] ll:flex-col">
        <ConnectionStatusStrip
          error={false}
          errorLabel={t("connectionLost")}
          hasData={splits.length > 0}
          refreshing={false}
          refreshingLabel={t("connectionLost")}
        />
        <ScrollArea
          orientation="both"
          className="ll:flex ll:min-h-0 ll:w-full ll:flex-1 ll:flex-col"
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
      </div>
    </DraggableWindow>
  );
};
