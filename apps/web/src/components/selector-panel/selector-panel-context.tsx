import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";

type SelectorPanelContextValue<T> = {
  selectedItem: T | null;
  setSelectedItem: (item: T | null) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  handleSelect: (item: T) => void;
  isMobile: boolean;
};

const SelectorPanelContext =
  createContext<SelectorPanelContextValue<unknown> | null>(null);

export type SelectorPanelProviderProps<T> = {
  children: ReactNode;
  onSelectionChange?: (item: T | null) => void;
};

export function SelectorPanelProvider<T>({
  children,
  onSelectionChange,
}: SelectorPanelProviderProps<T>) {
  const [selectedItem, setSelectedItemState] = useState<T | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const setSelectedItem = (item: T | null) => {
    setSelectedItemState(item);
    onSelectionChange?.(item);
  };

  const handleSelect = (item: T) => {
    setSelectedItem(item);
    if (isMobile) {
      setIsMobileDrawerOpen(true);
    }
  };

  useEffect(() => {
    if (!isMobile) {
      setIsMobileDrawerOpen(false);
    }
  }, [isMobile]);

  const value: SelectorPanelContextValue<T> = {
    selectedItem,
    setSelectedItem,
    isMobileDrawerOpen,
    setIsMobileDrawerOpen,
    handleSelect,
    isMobile,
  };

  return (
    <SelectorPanelContext.Provider
      value={value as SelectorPanelContextValue<unknown>}
    >
      {children}
    </SelectorPanelContext.Provider>
  );
}

export function useSelectorPanel<T>(): SelectorPanelContextValue<T> {
  const context = useContext(SelectorPanelContext);
  if (!context) {
    throw new Error(
      "useSelectorPanel must be used within a SelectorPanelProvider",
    );
  }
  return context as SelectorPanelContextValue<T>;
}
