const WINDOW_SELECTOR = ".whoishere-window";

const PLAYER_LIST_SELECTOR = `${WINDOW_SELECTOR} .player-list`;

const AIR_TAG_HOST_CLASS = "ll-who-is-here-air-tags";

type WhoIsHereRuntimeWindow = Window & {
  Engine?: {
    whoIsHere?: {
      getRelation?: (id: string, relation: number) => string;
      getPersonColor?: (kind: string) => string | undefined;
      isShow?: () => boolean;
      updateScroll?: () => void;
    };
    chatController?: {
      getChatInputWrapper?: () =>
        | { setPrivateMessageProcedure?: (nick: string) => void }
        | undefined;
    };
  };
};

const getRuntimeWindow = (): WhoIsHereRuntimeWindow => window;

export function getWhoIsHereAirTagHost(): HTMLElement | null {
  const list = document.querySelector(PLAYER_LIST_SELECTOR);

  if (!list) return null;
  const next = list.nextElementSibling;

  if (
    next instanceof HTMLElement &&
    next.classList.contains(AIR_TAG_HOST_CLASS)
  )
    return next;

  const host = document.createElement("div");
  host.className = AIR_TAG_HOST_CLASS;
  list.insertAdjacentElement("afterend", host);

  return host;
}

export function getWhoIsHereRelationColor(
  characterId: string,
  relation: number,
): string | undefined {
  try {
    const whoIsHere = getRuntimeWindow().Engine?.whoIsHere;
    const kind = whoIsHere?.getRelation?.(characterId, relation);

    return kind ? whoIsHere?.getPersonColor?.(kind) : undefined;
  } catch {
    return undefined;
  }
}

export function isWhoIsHereOpen(): boolean {
  try {
    return getRuntimeWindow().Engine?.whoIsHere?.isShow?.() ?? true;
  } catch {
    return true;
  }
}

export function subscribeWhoIsHereVisibility(onChange: () => void): () => void {
  const element = document.querySelector(WINDOW_SELECTOR);

  if (!element) return () => {};

  let open = isWhoIsHereOpen();

  const observer = new MutationObserver(() => {
    if (isWhoIsHereOpen() === open) return;

    open = !open;
    onChange();
  });

  observer.observe(element, { attributes: true, attributeFilter: ["style"] });

  return () => observer.disconnect();
}

export function refreshWhoIsHereScroll(): void {
  try {
    getRuntimeWindow().Engine?.whoIsHere?.updateScroll?.();
  } catch {}
}

export function startPrivateMessage(nick: string): void {
  try {
    getRuntimeWindow()
      .Engine?.chatController?.getChatInputWrapper?.()
      ?.setPrivateMessageProcedure?.(nick);
  } catch {}
}
