import type { BaseUIEvent } from "@base-ui/react/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Fragment,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type SyntheticEvent,
} from "react";
import {
  createSharedContextMenuRegistry,
  SHARED_CONTEXT_MENU_KEY_ATTRIBUTE,
  SharedContextMenuContext,
} from "./shared-context-menu-registry";

const TARGET_SELECTOR = `[${SHARED_CONTEXT_MENU_KEY_ATTRIBUTE}]`;

type SharedContextMenuProps = {
  /** The list element; it becomes the menu's only trigger. */
  children: ReactElement;
};

/**
 * One context menu for every row of a list. A menu root per row cost each row
 * its own stores and a document listener on mount, although a player opens at
 * most one menu at a time. Rows publish their menus with
 * `useSharedContextMenuTarget`.
 */
export const SharedContextMenu = ({ children }: SharedContextMenuProps) => {
  const [registry] = useState(createSharedContextMenuRegistry);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const openedRef = useRef<{
    index: number;
    list: HTMLElement;
    target: HTMLElement;
  } | null>(null);

  const entry = useSyncExternalStore(registry.subscribe, () =>
    targetKey === null ? undefined : registry.get(targetKey),
  );

  // A row that leaves the list closes its menu, as its own menu did.
  if (open && !entry) setOpen(false);

  // Right-click, long press and the keyboard shortcut all reach the list from
  // a row; anywhere else in the list keeps the browser's menu.
  const selectTarget = (event: BaseUIEvent<SyntheticEvent<HTMLElement>>) => {
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(TARGET_SELECTOR)
        : null;

    const key = target?.getAttribute(SHARED_CONTEXT_MENU_KEY_ATTRIBUTE);

    if (!target || !key || !event.currentTarget.contains(target)) {
      event.preventBaseUIHandler();

      return;
    }

    // A row without actions opens nothing, and keeps the browser's menu
    // closed as an empty menu of its own did.
    if (!registry.get(key)) {
      if (event.type === "contextmenu") event.preventDefault();
      event.preventBaseUIHandler();

      return;
    }

    const targets = event.currentTarget.querySelectorAll(TARGET_SELECTOR);

    openedRef.current = {
      index: [...targets].indexOf(target),
      list: event.currentTarget,
      target,
    };
    setTargetKey(key);
  };

  // Focus goes back to the row; when the row left the list meanwhile, to the
  // row now in its place, so a keyboard user keeps their position.
  const getFinalFocus = () => {
    const opened = openedRef.current;

    if (!opened || opened.target.isConnected) return opened?.target ?? null;
    const targets = opened.list.querySelectorAll<HTMLElement>(TARGET_SELECTOR);

    return targets[Math.min(opened.index, targets.length - 1)] ?? null;
  };

  return (
    <SharedContextMenuContext.Provider value={registry}>
      <ContextMenu open={open && !!entry} onOpenChange={setOpen}>
        <ContextMenuTrigger
          asChild
          onContextMenu={selectTarget}
          onTouchStart={selectTarget}
        >
          {children}
        </ContextMenuTrigger>

        <ContextMenuContent
          aria-label={entry?.["aria-label"]}
          className={entry?.className}
          finalFocus={getFinalFocus}
        >
          {/* Each row's menu keeps its own state, such as an open confirmation. */}
          <Fragment key={targetKey}>{entry?.items}</Fragment>
        </ContextMenuContent>
      </ContextMenu>
    </SharedContextMenuContext.Provider>
  );
};
