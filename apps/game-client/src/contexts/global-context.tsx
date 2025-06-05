import { useGlobalStore } from "@/store/global.store";
import { createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from "react-use";

export type GlobalContextType = {
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
  const { gameInitialized, setGameInitialized } = useGlobalStore();

  const [gameInterface, setGameInterface] = useState<"si" | "ni" | undefined>(
    undefined
  );
  const [lootlogWindowOpen, setLootlogWindowOpen] = useLocalStorage(
    `lootlog`,
    true
  );
  const [selectedGuild, setSelectedGuild] = useLocalStorage(`guild`, "");
  const [settingsWindowOpen, setSettingsWindowOpen] = useLocalStorage(
    `settings`,
    false
  );
  const [chatWindowOpen, setChatWindowOpen] = useLocalStorage(`chat`, true);

  const value: GlobalContextType = {
    gameInterface,
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
