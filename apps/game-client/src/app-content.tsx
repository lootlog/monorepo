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
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useInit } from "@/hooks/use-init";
import { useMapPings } from "@/features/map-pings/use-map-pings";
import { useAirTags } from "@/features/air-tags/use-air-tags";
import { useNotificationVolunteersSocket } from "@/features/party-finder/hooks/use-notification-volunteers-socket";
import { usePartyGatheringSocket } from "@/features/party-finder/hooks/use-party-gathering-socket";
import { usePartyReadyRoomExpiry } from "@/features/party-finder/hooks/use-party-ready-room-expiry";
import { usePartyReadyRoomObserver } from "@/features/party-finder/hooks/use-party-ready-room-observer";
import { usePartyReadyRoomSocket } from "@/features/party-finder/hooks/use-party-ready-room-socket";
import { usePartyReadyRoomSync } from "@/features/party-finder/hooks/use-party-ready-room-sync";
import { useTimerSettingsMutationsRegistry } from "@/hooks/use-timer-settings-mutations-registry";
import { useTimerSettingsSync } from "@/hooks/use-timer-settings-sync";

export const AppContent = () => {
  useGameEventHandlers();
  useInit();
  useGameAccountPreferencesSync();
  const mapPingHotkeyHandlers = useMapPings();
  useAirTags();
  useHotkeys(mapPingHotkeyHandlers);
  useTimerSettingsMutationsRegistry();
  useNotificationVolunteersSocket();
  usePartyGatheringSocket();
  usePartyReadyRoomSocket();
  usePartyReadyRoomSync();
  usePartyReadyRoomExpiry();
  usePartyReadyRoomObserver();

  const { ConflictDialog } = useTimerSettingsSync();
  const eventModeQuery = useEventModeQuery();
  const gameInitialized = useGlobalStore((state) =>
    Boolean(state.gameState.gameInitialized),
  );

  if (!gameInitialized) {
    return null;
  }

  return (
    <>
      <AnimationEffectsRootClass />
      <Timers />
      <AddTimer />
      <Settings />
      <Chat />
      <CommandWindow />
      <OnlinePlayers />
      <NpcDetector />
      <Notifications />
      <QuickAccess
        hasActiveEventMode={Boolean(eventModeQuery.data?.events.length)}
      />
      <CatchingWhitelistWarning />
      <BackendPreferencesWarning />
      <Toaster />
      <PartyFinder />
      <CreatePartyGathering />
      <MapPingWheel />
      <EventMode query={eventModeQuery} />
      {ConflictDialog}
    </>
  );
};
