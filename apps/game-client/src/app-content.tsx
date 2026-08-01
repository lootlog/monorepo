import { AddTimer } from "@/features/timers/add-timer";
import { AnimationEffectsRootClass } from "@/components/animation-effects-root-class";
import { BackendPreferencesWarning } from "@/features/backend-preferences-warning/backend-preferences-warning";
import { CatchingWhitelistWarning } from "@/features/catching-whitelist-warning/catching-whitelist-warning";
import { Chat } from "@/features/chat/chat";
import { CommandWindow } from "@/features/command/command";
import { CreatePartyGathering } from "@/features/party-finder/create-party-gathering";
import { MapPingWheel } from "@/features/map-pings/map-ping-wheel";
import { EventMode } from "@/features/event-mode/event-mode";
import { useEventModeQuery } from "@/features/event-mode/use-event-mode-query";
import { Notifications } from "@/features/notifications/notifications";
import { NpcDetector } from "@/features/npc-detector/npc-detector";
import { OnlinePlayers } from "@/features/online-players/online-players";
import { PartyFinder } from "@/features/party-finder/party-finder";
import { QuickAccess } from "@/features/quick-access/quick-access";
import { Settings } from "@/features/settings/settings";
import { Timers } from "@/features/timers/timers";
import { Toaster } from "@/components/ui/toaster";
import { useGameAccountPreferencesSync } from "@/hooks/use-game-account-preferences-sync";
import { useGameEventHandlers } from "@/hooks/game-events/use-game-event-handlers";
import { useGlobalStore } from "@/store/global.store";
import { useWindowsStore } from "@/store/windows.store";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useInit } from "@/hooks/use-init";
import { useMapPings } from "@/features/map-pings/use-map-pings";
import { useAirTags } from "@/features/air-tags/use-air-tags";
import { usePartyGatheringSocket } from "@/features/party-finder/hooks/use-party-gathering-socket";
import { usePartyReadyRoomExpiry } from "@/features/party-finder/hooks/use-party-ready-room-expiry";
import { usePartyReadyRoomObserver } from "@/features/party-finder/hooks/use-party-ready-room-observer";
import { usePartyReadyRoomSocket } from "@/features/party-finder/hooks/use-party-ready-room-socket";
import { usePartyReadyRoomSync } from "@/features/party-finder/hooks/use-party-ready-room-sync";
import { useTimerSettingsMutationsRegistry } from "@/hooks/use-timer-settings-mutations-registry";
import { useTimerSettingsSync } from "@/hooks/use-timer-settings-sync";
import { useSelectedLootlogGuildInitialization } from "@/hooks/use-selected-lootlog-guild";
import { PerformanceProfiler } from "@/lib/performance-monitoring/performance-profiler";

export const AppContent = () => {
  useGameEventHandlers();
  useInit();
  useSelectedLootlogGuildInitialization();
  useGameAccountPreferencesSync();
  const mapPingHotkeyHandlers = useMapPings();
  useAirTags();
  useHotkeys(mapPingHotkeyHandlers);
  useTimerSettingsMutationsRegistry();
  usePartyGatheringSocket();
  usePartyReadyRoomSocket();
  usePartyReadyRoomSync();
  usePartyReadyRoomExpiry();
  usePartyReadyRoomObserver();

  const { ConflictDialog } = useTimerSettingsSync();
  const isEventModePresentationVisible = useWindowsStore(
    (state) => state["event-mode"].open || state["quick-access"].open,
  );
  const eventModeQuery = useEventModeQuery({
    active: isEventModePresentationVisible,
  });
  const gameInitialized = useGlobalStore((state) =>
    Boolean(state.gameState.gameInitialized),
  );

  if (!gameInitialized) {
    return null;
  }

  return (
    <>
      <PerformanceProfiler id="feature.animation-effects">
        <AnimationEffectsRootClass />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.timers">
        <Timers />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.add-timer">
        <AddTimer />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.settings">
        <Settings />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.chat">
        <Chat />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.command">
        <CommandWindow />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.online-players">
        <OnlinePlayers />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.npc-detector">
        <NpcDetector />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.notifications">
        <Notifications />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.quick-access">
        <QuickAccess
          hasActiveEventMode={Boolean(eventModeQuery.data?.events.length)}
        />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.catching-whitelist-warning">
        <CatchingWhitelistWarning />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.backend-preferences-warning">
        <BackendPreferencesWarning />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.toaster">
        <Toaster />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.party-finder">
        <PartyFinder />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.create-party-gathering">
        <CreatePartyGathering />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.map-ping-wheel">
        <MapPingWheel />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.event-mode">
        <EventMode query={eventModeQuery} />
      </PerformanceProfiler>
      <PerformanceProfiler id="feature.timer-conflict-dialog">
        {ConflictDialog}
      </PerformanceProfiler>
    </>
  );
};
