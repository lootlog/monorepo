import { createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from "react-use";

export type GlobalContextType = {
  initialized: boolean;
  gameInterface: "si" | "ni" | undefined;
  lootlogWindowOpen: boolean | undefined;
  setLootlogWindowOpen: (open: boolean | undefined) => void;
  selectedGuild: string | undefined;
  setSelectedGuild: (guild: string | undefined) => void;
  settingsWindowOpen: boolean | undefined;
  setSettingsWindowOpen: (open: boolean | undefined) => void;
  chatWindowOpen: boolean | undefined;
  setChatWindowOpen: (open: boolean | undefined) => void;
};

export const GlobalContext = createContext<GlobalContextType>(
  {} as GlobalContextType
);

export const GlobalContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const charId = window.Engine?.hero?.d?.id;
  const [initialized, setInitialized] = useState(false);
  const [gameInterface, setGameInterface] = useState<"si" | "ni" | undefined>(
    undefined
  );
  const [lootlogWindowOpen, setLootlogWindowOpen] = useLocalStorage(
    `lootlog-${charId}`,
    true
  );
  const [selectedGuild, setSelectedGuild] = useLocalStorage(
    `guild-${charId}`,
    ""
  );
  const [settingsWindowOpen, setSettingsWindowOpen] = useLocalStorage(
    `settings-${charId}`,
    false
  );
  const [chatWindowOpen, setChatWindowOpen] = useLocalStorage(
    `chat-${charId}`,
    false
  );

  const init = async () => {
    const started = typeof window._g == "function";
    if (!started) {
      setTimeout(init, 500);
      return;
    }

    const isNI = typeof window.Engine == "object";
    setGameInterface(isNI ? "ni" : "si");

    const initialized = isNI
      ? window.Engine?.interface?.alreadyInitialised ||
        window.Engine?.interface?.getAlreadyInitialised?.()
      : window.g?.init === 5;

    if (!initialized) {
      setTimeout(init, 500);
      return;
    }

    setInitialized(true);
  };

  useEffect(() => {
    init();
  }, []);

  const value: GlobalContextType = {
    gameInterface,
    initialized,
    lootlogWindowOpen,
    setLootlogWindowOpen,
    settingsWindowOpen,
    setSettingsWindowOpen,
    selectedGuild,
    setSelectedGuild,
    chatWindowOpen,
    setChatWindowOpen,
  };

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);

  if (!context) {
    throw new Error(
      "useGlobalContext must be used within a GlobalContextProvider"
    );
  }

  return context;
};
