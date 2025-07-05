import { Timers } from "@/features/timers/timers";
import { Settings } from "@/features/settings/settings";
import { useGameEventsParser } from "@/hooks/use-game-events-parser";
import { Chat } from "@/features/chat/chat";
import { useGlobalStore } from "@/store/global.store";
import { useInitialConfiguration } from "@/hooks/use-initial-configuration";
import { OnlinePlayers } from "@/features/online-players/online-players";
import { AddTimer } from "@/features/timers/add-timer";
import { NpcDetector } from "@/features/npc-detector/npc-detector";
import { Notifications } from "@/features/notifications/notifications";
import { QuickAccess } from "@/features/quick-access/quick-access";
import { useHotkeys } from "@/hooks/use-hotkeys";

function App() {
  useGameEventsParser();
  useInitialConfiguration();
  useHotkeys();

  const { gameInitialized } = useGlobalStore((state) => state.gameState);

  return (
    gameInitialized && (
      <>
        <Timers />
        <AddTimer />
        <Settings />
        <Chat />
        <OnlinePlayers />
        <NpcDetector />
        <Notifications />
        <QuickAccess />
      </>
    )
  );
}

export default App;
