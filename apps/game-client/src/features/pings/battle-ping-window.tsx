import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { WindowMaxHeightAction } from "@/components/draggable-window/window-max-height-action";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isWarriorDead } from "@/hooks/game-events/helpers/battle.helpers";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useGameStore } from "@/store/game.store";
import { useWindowsStore } from "@/store/windows.store";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { BattlePingHistoryRow } from "./battle-ping-history-row";
import { battlePingStore } from "./battle-ping-store";
import { BattlePingTargetRow } from "./battle-ping-target-row";
import { getBattleWarrior } from "./battle-warriors";
import { getPingPresentation } from "./ping-presentation";

/**
 * Who pinged what in the current fight. The warriors only carry icons, so
 * this is where the sender, the target and the time are. It opens with the
 * fight's first ping; closing it hides it until the next fight.
 */
export const BattlePingWindow = () => {
  const { t } = useTranslation("pings");

  const { fightPinged, history, marks, target } = useSyncExternalStore(
    battlePingStore.subscribe,
    battlePingStore.getSnapshot,
  );

  const warriors = useBattleStore((state) => state.battleWarriors);
  const heroName = useGameStore((state) => state.game?.hero.name);
  const open = useWindowsStore((state) => state["battle-pings"].open);

  const defaultWindowHeight = useWindowsStore(
    (state) => state["battle-pings"].size.height,
  );

  const storedMaxContentHeight = useWindowsStore(
    (state) => state["battle-pings"].maxContentHeight,
  );

  const setOpen = useWindowsStore((state) => state.setOpen);

  const setMaxContentHeight = useWindowsStore(
    (state) => state.setMaxContentHeight,
  );

  const [isMaxHeightAdjustmentArmed, setIsMaxHeightAdjustmentArmed] =
    useState(false);

  const [now, setNow] = useState(() => performance.now());
  const hasHistory = history.length > 0;
  const visible = open && hasHistory;

  // Opens once per fight: a rejected ping emptying the history must not
  // reopen a window the player closed.
  useEffect(() => {
    if (fightPinged) setOpen("battle-pings", true);
  }, [fightPinged, setOpen]);

  // Ticks the "seconds ago" labels only while the window is shown, and lets
  // go of a highlighted warrior when the window goes away under the pointer.
  useEffect(() => {
    if (!visible) return;

    const interval = window.setInterval(() => setNow(performance.now()), 1_000);

    return () => {
      window.clearInterval(interval);
      battlePingStore.highlightWarrior(null);
    };
  }, [visible]);

  const formatAgo = (receivedAt: number) => {
    const seconds = Math.floor((now - receivedAt) / 1_000);

    return seconds < 1
      ? t("battle.justNow")
      : t("battle.secondsAgo", { seconds });
  };

  const formatSender = (senderName: string) =>
    senderName === heroName ? t("battle.you") : senderName;

  const warriorName = (warriorId: number) =>
    getBattleWarrior(warriors, warriorId)?.name ?? t("battle.unknownWarrior");

  return (
    <DraggableWindow
      isOpen={visible}
      id="battle-pings"
      title={t("battle.windowTitle")}
      actions=<WindowMaxHeightAction
        currentMaxHeight={storedMaxContentHeight ?? defaultWindowHeight}
        isArmed={isMaxHeightAdjustmentArmed}
        onClick={() =>
          setIsMaxHeightAdjustmentArmed((currentValue) => !currentValue)
        }
      />
      onClose={() => setOpen("battle-pings", false)}
      heightMode="auto-up-to-max"
      maxContentHeight={storedMaxContentHeight ?? defaultWindowHeight}
      isMaxHeightAdjustmentArmed={isMaxHeightAdjustmentArmed}
      onMaxHeightAdjustmentArmedChange={setIsMaxHeightAdjustmentArmed}
      onMaxContentHeightChange={(nextMaxContentHeight) =>
        setMaxContentHeight("battle-pings", nextMaxContentHeight)
      }
      contentClassName="ll:-mx-1 ll:-mb-1"
      resizable
      minHeight={64}
      maxHeight={600}
      minWidth={220}
    >
      <ScrollArea className="ll:h-full ll:max-h-[inherit] ll:w-full">
        <div className="ll:flex ll:flex-col ll:gap-1.5 ll:pb-1">
          {target ? (
            <section className="ll:flex ll:flex-col ll:gap-1 ll:px-1 ll:pt-1">
              <h3 className="ll:m-0 ll:text-[10px] ll:font-semibold ll:uppercase ll:tracking-wider ll:text-muted-foreground">
                {t("battle.target")}
              </h3>
              <BattlePingTargetRow
                ago={formatAgo(target.receivedAt)}
                sender={
                  target.senderName === heroName ? null : target.senderName
                }
                target={warriorName(target.warriorId)}
                warriorId={target.warriorId}
              />
            </section>
          ) : null}
          <section className="ll:flex ll:flex-col ll:gap-1">
            {target ? (
              <h3 className="ll:m-0 ll:px-1 ll:text-[10px] ll:font-semibold ll:uppercase ll:tracking-wider ll:text-muted-foreground">
                {t("battle.recent")}
              </h3>
            ) : null}
            <ul className="ll:m-0 ll:flex ll:list-none ll:flex-col ll:p-0">
              {history.map((entry) => {
                const warrior = getBattleWarrior(warriors, entry.warriorId);
                const presentation = getPingPresentation(entry.type);

                const onField =
                  target?.entryId === entry.id ||
                  marks.get(entry.warriorId)?.entryId === entry.id;

                return (
                  <BattlePingHistoryRow
                    key={entry.id}
                    ago={formatAgo(entry.receivedAt)}
                    dead={warrior ? isWarriorDead(warrior) : false}
                    forMe={entry.forMe}
                    icon={presentation.icon}
                    label={t(presentation.translationKey)}
                    onField={onField}
                    sender={formatSender(entry.senderName)}
                    // Calls for healing or a quick fight are about the
                    // sender's own warrior.
                    target={
                      warrior?.name === entry.senderName
                        ? null
                        : warriorName(entry.warriorId)
                    }
                    tone={presentation.tone}
                    warriorId={entry.warriorId}
                  />
                );
              })}
            </ul>
          </section>
        </div>
      </ScrollArea>
    </DraggableWindow>
  );
};
