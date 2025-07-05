import { useEffect, useRef, useState, useMemo } from "react";
import { useLocalStorage } from "react-use";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { AxiosResponse } from "axios";
import { AnimatePresence, motion } from "framer-motion";

import { DraggableWindow } from "@/components/draggable-window";
import { GuildSelector } from "@/components/guild-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tile } from "@/components/ui/tile";
import { SingleTimer } from "@/features/timers/components/single-timer";
import {
  useGuildPermissions,
  Permission,
} from "@/hooks/api/use-guild-permissions";
import { useTimers, Timer } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import { GatewayEvent } from "@/config/gateway";
import { GuildMember } from "@/hooks/api/use-guild-members";
import { UnderBagTimers } from "@/features/timers/under-bag-timers";

type TimerWithTimeLeft = Timer & { timeLeft: number; members?: GuildMember[] };

const REQUIRED_DELETE_PERMISSIONS = [
  Permission.LOOTLOG_MANAGE,
  Permission.OWNER,
  Permission.ADMIN,
];

const mergeTimers = (timers: Timer[]): TimerWithTimeLeft[] => {
  const map = new Map<number, TimerWithTimeLeft>();

  for (const timer of timers) {
    const existing = map.get(timer.npcId);

    if (!existing) {
      map.set(timer.npcId, {
        ...timer,
        members: timer.member ? [timer.member] : [],
        timeLeft: 0, // placeholder
      });
    } else {
      if (new Date(timer.maxSpawnTime) > new Date(existing.maxSpawnTime)) {
        map.set(timer.npcId, {
          ...timer,
          members: [
            ...(existing.members || []),
            ...(timer.member ? [timer.member] : []),
          ],
          timeLeft: 0,
        });
      } else {
        existing.members = [
          ...(existing.members || []),
          ...(timer.member ? [timer.member] : []),
        ];
      }
    }
  }

  return Array.from(map.values());
};

export const Timers = () => {
  const { characterId, accountId, world, gameInterface } = useGlobalStore(
    (s) => s.gameState
  );
  const {
    timers: { open },
    "add-timer": { open: addTimerOpen },
    toggleOpen,
    setOpen,
  } = useWindowsStore();
  const {
    hiddenTimers,
    pinnedTimers,
    removeTimerAfterMs,
    compactMode,
    timersGrouping,
    timersUnderBag,
  } = useTimersStore();
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    "ll-timers-selected-guild",
    ""
  );
  const { data: guildPermissions } = useGuildPermissions({
    guildId: selectedGuildId,
  });
  const { data: timers } = useTimers({ world });
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();

  const [calculatedTimers, setCalculatedTimers] = useState<TimerWithTimeLeft[]>(
    []
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const canDeleteTimers = useMemo(
    () =>
      REQUIRED_DELETE_PERMISSIONS.some((perm) =>
        guildPermissions?.includes(perm)
      ),
    [guildPermissions]
  );

  const activeTimers = useMemo(() => {
    const rawTimers = timers ?? [];
    const merged = timersGrouping ? mergeTimers(rawTimers) : rawTimers;
    const now = Date.now();

    return merged
      .map((timer) => ({
        ...timer,
        timeLeft: new Date(timer.maxSpawnTime).getTime() - now,
      }))
      .filter((t) => t.timeLeft > -removeTimerAfterMs);
  }, [timers, timersGrouping, removeTimerAfterMs]);

  useEffect(() => {
    setCalculatedTimers(activeTimers);
  }, [activeTimers]);

  const handleTimerMessage = (data: Timer) => {
    queryClient.setQueryData(
      ["guild-timers", world],
      (old: AxiosResponse<Timer[]>) => {
        if (data.world !== world) return old;
        const updated = [...(old?.data || [])];
        const index = updated.findIndex(
          (t) =>
            t.npcId === data.npcId &&
            t.guildId === data.guildId &&
            t.world === data.world
        );
        index !== -1 ? (updated[index] = data) : updated.push(data);
        return { data: updated };
      }
    );
  };

  const handleTimerRemove = (data: Timer) => {
    queryClient.setQueryData(
      ["guild-timers", world],
      (old: AxiosResponse<Timer[]>) => {
        if (data.world !== world) return old;
        const filtered =
          old?.data.filter(
            (t) =>
              !(
                t.npcId === data.npcId &&
                t.world === data.world &&
                t.guildId === data.guildId
              )
          ) || [];
        return { data: filtered };
      }
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCalculatedTimers((prev) =>
        prev
          .map((timer) => ({
            ...timer,
            timeLeft: new Date(timer.maxSpawnTime).getTime() - now,
          }))
          .filter((t) => t.timeLeft > -removeTimerAfterMs)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [removeTimerAfterMs]);

  useEffect(() => {
    if (!connected) return;
    socket?.on(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
    socket?.on(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    return () => {
      socket?.off(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
      socket?.off(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    };
  }, [connected]);

  const key = `${accountId}${characterId}`;
  const sortedTimers = useMemo(() => {
    return calculatedTimers
      .filter((t) => timersGrouping || t.guildId === selectedGuildId)
      .filter((t) => !hiddenTimers[key]?.includes?.(t.npc.name))
      .sort((a, b) => {
        const pinA = pinnedTimers[key]?.includes?.(a.npc.name);
        const pinB = pinnedTimers[key]?.includes?.(b.npc.name);
        if (pinA && !pinB) return -1;
        if (!pinA && pinB) return 1;
        return (
          new Date(a.maxSpawnTime).getTime() -
          new Date(b.maxSpawnTime).getTime()
        );
      });
  }, [
    calculatedTimers,
    selectedGuildId,
    hiddenTimers,
    pinnedTimers,
    timersGrouping,
  ]);

  const renderTimers = () => {
    return (
      <span
        ref={containerRef}
        className="ll-h-full ll-flex ll-flex-1 ll-flex-col ll-box-border ll-pt-1 ll-w-full"
      >
        {!timersGrouping && (
          <GuildSelector
            selectedGuildId={selectedGuildId}
            setSelectedGuildId={setSelectedGuildId}
            disabled={addTimerOpen}
            className="ll-bg-black/20"
          />
        )}
        <ScrollArea className="!ll-h-full ll-pb-1 !ll-w-full" type="hover">
          {sortedTimers.length === 0 ? (
            <span className="ll-text-white ll-w-full ll-flex ll-justify-center">
              ----
            </span>
          ) : (
            <span
              className="ll-grid ll-gap-0.5 ll-box-border ll-w-full"
              style={{
                gridTemplateColumns: compactMode
                  ? "repeat(auto-fit, minmax(115px, 1fr))"
                  : "repeat(auto-fit, minmax(232px, 1fr))",
              }}
            >
              {sortedTimers.map((timer) => (
                <SingleTimer
                  key={`${timer.npcId}-${timer.guildId}`}
                  timer={timer}
                  timeLeft={timer.timeLeft}
                  compactMode={compactMode}
                  canDelete={canDeleteTimers}
                />
              ))}
            </span>
          )}
        </ScrollArea>

        {!timersGrouping && (
          <Tile onClick={() => toggleOpen("add-timer")}>
            <PlusIcon color="white" height={16} width={16} />
          </Tile>
        )}
      </span>
    );
  };

  if (timersUnderBag && gameInterface === "ni") {
    return <UnderBagTimers>{renderTimers()}</UnderBagTimers>;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="timers"
          initial={{ opacity: 0, scaleY: 1.01 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          <DraggableWindow
            id="timers"
            title="Timery"
            onClose={() => setOpen("timers", false)}
            minHeight={108}
          >
            {renderTimers()}
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
