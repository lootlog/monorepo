import type { ContextMenuContent } from "@/components/ui/context-menu";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";

export const SHARED_CONTEXT_MENU_KEY_ATTRIBUTE = "data-shared-context-menu-key";

export type SharedContextMenuEntry = Pick<
  ComponentProps<typeof ContextMenuContent>,
  "aria-label" | "className"
> & {
  items: ReactNode;
};

type Listener = () => void;

export const createSharedContextMenuRegistry = () => {
  const entries = new Map<string, SharedContextMenuEntry>();
  const listeners = new Set<Listener>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    get: (key: string) => entries.get(key),
    set: (key: string, entry: SharedContextMenuEntry) => {
      if (entries.get(key) === entry) return;
      entries.set(key, entry);
      notify();
    },
    delete: (key: string) => {
      if (!entries.delete(key)) return;
      notify();
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export type SharedContextMenuRegistry = ReturnType<
  typeof createSharedContextMenuRegistry
>;

export const SharedContextMenuContext =
  createContext<SharedContextMenuRegistry | null>(null);

export const useSharedContextMenuTarget = (
  key: string,
  entry: SharedContextMenuEntry | null,
) => {
  const registry = useContext(SharedContextMenuContext);
  const published = useRef(false);

  if (!registry) {
    throw new Error("useSharedContextMenuTarget requires SharedContextMenu");
  }

  useLayoutEffect(() => {
    if (entry) {
      registry.set(key, entry);
      published.current = true;
    } else if (published.current) {
      registry.delete(key);
      published.current = false;
    }
  });

  useLayoutEffect(
    () => () => {
      if (published.current) registry.delete(key);
      published.current = false;
    },
    [registry, key],
  );

  return { [SHARED_CONTEXT_MENU_KEY_ATTRIBUTE]: key };
};
