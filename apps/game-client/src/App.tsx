import { Timers } from "@/features/timers/timers";
import { Settings } from "@/features/settings/settings";
import { useGameEventsParser } from "@/hooks/use-game-events-parser";
import { useGlobalContext } from "./contexts/global-context";

function App() {
  useGameEventsParser();
  const { initialized } = useGlobalContext();

  return (
    <>
      {initialized && (
        <>
          <Timers />
          <Settings />
        </>
      )}
    </>
  );
}

export default App;
