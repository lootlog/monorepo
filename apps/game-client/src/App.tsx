import { Timers } from "@/features/timers/timers";
import { Settings } from "@/features/settings/settings";
import { Chat } from "@/features/chat/chat";
import { useGlobalStore } from "@/store/global.store";
import { OnlinePlayers } from "@/features/online-players/online-players";
import { AddTimer } from "@/features/timers/add-timer";
import { NpcDetector } from "@/features/npc-detector/npc-detector";
import { Notifications } from "@/features/notifications/notifications";
import { QuickAccess } from "@/features/quick-access/quick-access";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { Toaster } from "@/components/ui/toaster";
import { useTimerSettingsSync } from "@/hooks/use-timer-settings-sync";
import { useTimerSettingsMutationsRegistry } from "@/hooks/use-timer-settings-mutations-registry";
import { CatchingWhitelistWarning } from "@/features/catching-whitelist-warning/catching-whitelist-warning";
import { useGameEventHandlers } from "@/hooks/game-events/use-game-event-handlers";
import { useInit } from "@/hooks/use-init";
import { useInitialConfiguration } from "@/hooks/use-initial-configuration";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { storageKey } from "@/lib/storage-key";
import { ThemeProvider } from "@/components/theme-provider";
import { CommandWindow } from "./features/command/command";
import { SocketProvider } from "@/contexts/socket-context";
import { ErrorBoundary } from "react-error-boundary";
import { PartyFinder } from "@/features/party-finder/party-finder";
import { CreatePartyGathering } from "@/features/party-finder/create-party-gathering";
import { usePartyFinderSocket } from "@/features/party-finder/hooks/use-party-finder-socket";
import { usePartyGatheringSocket } from "@/features/party-finder/hooks/use-party-gathering-socket";

const THEME_STORAGE_KEY = storageKey("lootlog-theme");

function AppContent() {
  useGameEventHandlers();
  useInit();
  useInitialConfiguration();
  useHotkeys();
  useTimerSettingsMutationsRegistry();
  usePartyFinderSocket();
  usePartyGatheringSocket();

  const { ConflictDialog } = useTimerSettingsSync();
  const gameInitialized = useGlobalStore((s) => s.gameState.gameInitialized);

  return (
    gameInitialized && (
      <>
        <Timers />
        <AddTimer />
        <Settings />
        <Chat />
        <CommandWindow />
        <OnlinePlayers />
        <NpcDetector />
        <Notifications />
        <QuickAccess />
        <CatchingWhitelistWarning />
        <Toaster />
        <PartyFinder />
        <CreatePartyGathering />
        {ConflictDialog}
      </>
    )
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark-theme" storageKey={THEME_STORAGE_KEY}>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <ErrorBoundary
            fallback={<div>Error loading app</div>}
            onError={(error, info) => {
              console.error("[ErrorBoundary]", error);
            }}
          >
            <AppContent />
          </ErrorBoundary>
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
