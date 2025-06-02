import { createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from "react-use";

export type GlobalContextType = {
  initialized: boolean;
  newInterface: boolean;
  lootlogWindowOpen: boolean | undefined;
  setLootlogWindowOpen: (open: boolean | undefined) => void;
  selectedGuild: string | undefined;
  setSelectedGuild: (guild: string | undefined) => void;
  settingsWindowOpen: boolean | undefined;
  setSettingsWindowOpen: (open: boolean | undefined) => void;
};

export const GlobalContext = createContext<GlobalContextType>(
  {} as GlobalContextType
);

export const GlobalContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [initialized, setInitialized] = useState(false);
  const [newInterface, setNewInterface] = useState(false);
  const [lootlogWindowOpen, setLootlogWindowOpen] = useLocalStorage(
    "lootlog",
    false
  );
  const [selectedGuild, setSelectedGuild] = useLocalStorage("guild", "");
  const [settingsWindowOpen, setSettingsWindowOpen] = useLocalStorage(
    "settings",
    false
  );

  const init = async () => {
    const started = typeof window._g == "function";
    if (!started) {
      setTimeout(init, 500);
      return;
    }

    const isNI = typeof window.Engine == "object";
    setNewInterface(isNI);

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
    newInterface,
    initialized,
    lootlogWindowOpen,
    setLootlogWindowOpen,
    settingsWindowOpen,
    setSettingsWindowOpen,
    selectedGuild,
    setSelectedGuild,
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
