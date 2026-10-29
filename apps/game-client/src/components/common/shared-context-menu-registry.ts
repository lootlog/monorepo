import type { ContextMenuContent } from "@/components/ui/context-menu";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";

/** Marks a row as a target of the surrounding shared context menu. */
export const SHARED_CONTEXT_MENU_KEY_ATTRIBUTE = "data-shared-context-menu-key";

/** The menu one row shows: its items and the popup props that vary by row. */
export type SharedContextMenuEntry = Pick<
  ComponentProps<typeof ContextMenuContent>,
  "aria-label" | "className"
> & {
  items: ReactNode;
};

type Listener = () => void;

/**
 * The menu each row publishes for the list's single context menu. A row keeps
 * its own actions and their in-flight state; the open menu reads the latest
 * entry of the row it was opened on.
 */
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

/**
 * Publishes a row's menu to the surrounding SharedContextMenu and returns the
 * attribute that makes the row's element its target. A row without an entry
 * opens no menu. A row withdraws only the entry it published,
 * so a component that hands its row to another one may share its key.
 */
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
