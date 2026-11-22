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
  children: ReactElement;
};

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

  if (open && !entry) setOpen(false);

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
          <Fragment key={targetKey}>{entry?.items}</Fragment>
        </ContextMenuContent>
      </ContextMenu>
    </SharedContextMenuContext.Provider>
  );
};
