// The "Gracze na mapie" window exists once per game session; its native list
// is rebuilt by the game, so Lootlog content lives in a sibling after it.
const PLAYER_LIST_SELECTOR = ".whoishere-window .player-list";

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

/** The element after the native player list that holds Lootlog rows, created on first use. */
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

/** The colour the player chose in the game for this relation, as native rows use it. */
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

/** Whether the window is open; assumed open when the game does not say. */
export function isWhoIsHereOpen(): boolean {
  try {
    return getRuntimeWindow().Engine?.whoIsHere?.isShow?.() ?? true;
  } catch {
    return true;
  }
}

/** The custom scrollbar only measures its content when told to. */
export function refreshWhoIsHereScroll(): void {
  try {
    getRuntimeWindow().Engine?.whoIsHere?.updateScroll?.();
  } catch {
    // The native list keeps its previous scroll size.
  }
}

/** What a click on a native row does. */
export function startPrivateMessage(nick: string): void {
  try {
    getRuntimeWindow()
      .Engine?.chatController?.getChatInputWrapper?.()
      ?.setPrivateMessageProcedure?.(nick);
  } catch {
    // The chat input is not available yet.
  }
}
