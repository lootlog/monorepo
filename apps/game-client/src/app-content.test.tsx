import { render, screen } from "@testing-library/react";
import { AppContent } from "@/app-content";

const mapPingHotkeyHandlers = vi.hoisted(() => ({
  onMapPingCancel: vi.fn(),
  onMapPingEnd: vi.fn(),
  onMapPingStart: vi.fn(),
}));
const useHotkeys = vi.hoisted(() => vi.fn());
const useAirTags = vi.hoisted(() => vi.fn());
const useSelectedLootlogGuildInitialization = vi.hoisted(() => vi.fn());
const eventModeQuery = vi.hoisted(() => ({
  data: {
    generatedAt: "2026-07-13T12:00:00.000Z",
    events: [{ id: "event-1" }],
  },
}));

vi.mock("@/features/map-pings/use-map-pings", () => ({
  useMapPings: () => mapPingHotkeyHandlers,
}));
vi.mock("@/features/air-tags/use-air-tags", () => ({ useAirTags }));
vi.mock("@/hooks/use-hotkeys", () => ({ useHotkeys }));
vi.mock("@/hooks/use-selected-lootlog-guild", () => ({
  useSelectedLootlogGuildInitialization,
}));
vi.mock("@/features/map-pings/map-ping-wheel", () => ({
  MapPingWheel: () => <div data-testid="map-ping-wheel" />,
}));
vi.mock("@/features/event-mode/event-mode", () => ({
  EventMode: ({ query }: { query: typeof eventModeQuery }) => (
    <div
      data-has-query={String(query === eventModeQuery)}
      data-testid="event-mode"
    />
  ),
}));
vi.mock("@/features/event-mode/use-event-mode-query", () => ({
  useEventModeQuery: () => eventModeQuery,
}));

vi.mock("@/store/global.store", () => ({
  useGlobalStore: (
    selector: (state: { gameState: { gameInitialized: boolean } }) => unknown,
  ) => selector({ gameState: { gameInitialized: true } }),
}));
vi.mock("@/hooks/use-timer-settings-sync", () => ({
  useTimerSettingsSync: () => ({ ConflictDialog: null }),
}));

vi.mock("@/components/animation-effects-root-class", () => ({
  AnimationEffectsRootClass: () => null,
}));
vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));
vi.mock(
  "@/features/backend-preferences-warning/backend-preferences-warning",
  () => ({ BackendPreferencesWarning: () => null }),
);
vi.mock(
  "@/features/catching-whitelist-warning/catching-whitelist-warning",
  () => ({ CatchingWhitelistWarning: () => null }),
);
vi.mock("@/features/chat/chat", () => ({ Chat: () => null }));
vi.mock("@/features/command/command", () => ({
  CommandWindow: () => null,
}));
vi.mock("@/features/notifications/notifications", () => ({
  Notifications: () => null,
}));
vi.mock("@/features/npc-detector/npc-detector", () => ({
  NpcDetector: () => null,
}));
vi.mock("@/features/online-players/online-players", () => ({
  OnlinePlayers: () => null,
}));
vi.mock("@/features/party-finder/create-party-gathering", () => ({
  CreatePartyGathering: () => null,
}));
vi.mock("@/features/party-finder/party-finder", () => ({
  PartyFinder: () => null,
}));
vi.mock("@/features/quick-access/quick-access", () => ({
  QuickAccess: ({ hasActiveEventMode }: { hasActiveEventMode: boolean }) => (
    <div
      data-has-active-event-mode={String(hasActiveEventMode)}
      data-testid="quick-access"
    />
  ),
}));
vi.mock("@/features/settings/settings", () => ({ Settings: () => null }));
vi.mock("@/features/timers/add-timer", () => ({ AddTimer: () => null }));
vi.mock("@/features/timers/timers", () => ({ Timers: () => null }));

vi.mock("@/hooks/game-events/use-game-event-handlers", () => ({
  useGameEventHandlers: () => undefined,
}));
vi.mock("@/hooks/use-game-account-preferences-sync", () => ({
  useGameAccountPreferencesSync: () => undefined,
}));
vi.mock("@/hooks/use-init", () => ({ useInit: () => undefined }));
vi.mock("@/hooks/use-timer-settings-mutations-registry", () => ({
  useTimerSettingsMutationsRegistry: () => undefined,
}));
vi.mock(
  "@/features/party-finder/hooks/use-notification-volunteers-socket",
  () => ({ useNotificationVolunteersSocket: () => undefined }),
);
vi.mock("@/features/party-finder/hooks/use-party-gathering-socket", () => ({
  usePartyGatheringSocket: () => undefined,
}));
vi.mock("@/features/party-finder/hooks/use-party-ready-room-expiry", () => ({
  usePartyReadyRoomExpiry: () => undefined,
}));
vi.mock("@/features/party-finder/hooks/use-party-ready-room-observer", () => ({
  usePartyReadyRoomObserver: () => undefined,
}));
vi.mock("@/features/party-finder/hooks/use-party-ready-room-socket", () => ({
  usePartyReadyRoomSocket: () => undefined,
}));
vi.mock("@/features/party-finder/hooks/use-party-ready-room-sync", () => ({
  usePartyReadyRoomSync: () => undefined,
}));

describe("AppContent map ping integration", () => {
  it("wires the map ping lifecycle into hotkeys and mounts the wheel", () => {
    render(<AppContent />);

    expect(useHotkeys).toHaveBeenCalledWith(mapPingHotkeyHandlers);
    expect(useAirTags).toHaveBeenCalledOnce();
    expect(useSelectedLootlogGuildInitialization).toHaveBeenCalledOnce();
    expect(screen.getByTestId("map-ping-wheel")).toBeInTheDocument();
    expect(screen.getByTestId("event-mode")).toHaveAttribute(
      "data-has-query",
      "true",
    );
    expect(screen.getByTestId("quick-access")).toHaveAttribute(
      "data-has-active-event-mode",
      "true",
    );
  });
});
