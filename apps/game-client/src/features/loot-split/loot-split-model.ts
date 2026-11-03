import type { GameEvent } from "@lootlog/margonem/game-events";
import type {
  LootSplitChoice,
  LootSplitEvent,
} from "@lootlog/schema/loot-split";
import { getItemStat } from "@/utils/game/get-item-stat";

/**
 * Group loot splits the hero takes part in, and every participant's choices
 * as far as this client knows them. Margonem tells each player only their own
 * choices (`loot.states`); the rest arrive from other Lootlog clients.
 *
 * Several splits can be open at once: a party leader can accept, disband and
 * regroup without the member who is still choosing, then fight again. A split
 * therefore keeps the participants it opened with.
 */

export type LootSplitParticipant = Readonly<{
  characterId: string;
  name: string;
  profession: string;
}>;

export type LootSplitItem = Readonly<{
  id: string;
  /** Item hash, which the "Podział łupów" chat message quotes. */
  hid: string;
  name: string;
  icon: string;
  /** Professions allowed to pick "bardzo chcę" (`reqp`); empty = everyone. */
  mustProfessions: readonly string[];
}>;

export type LootSplitView = Readonly<{
  choices: Readonly<Record<string, LootSplitChoice>>;
  accepted: boolean;
  /** Accepted by the game itself, when a new fight or loot closed the window. */
  inferred: boolean;
}>;

export type LootSplit = Readonly<{
  /** The smallest item id: item ids are unique server-wide. */
  id: string;
  phase: "open" | "resolved" | "expired";
  deadline: number;
  closedAt: number | null;
  items: readonly LootSplitItem[];
  participants: readonly LootSplitParticipant[];
  /** By character id; a participant without a view sent nothing. */
  views: Readonly<Record<string, LootSplitView>>;
}>;

export type LootSplitState = Readonly<{
  heroId: string | null;
  splits: readonly LootSplit[];
  /** The split whose window the hero has; the game shows one at a time. */
  ownSplitId: string | null;
  /**
   * The hero sent `final=1` for its split; it counts as accepted only once
   * the server answers without refusing it.
   */
  acceptRequested: boolean;
}>;

export type LootSplitStatus = "accepted" | "choosing" | "timedOut" | "unknown";

/** Closed splits stay listed this long, so their outcome can be read. */
export const CLOSED_SPLIT_LINGER_MS = 6_000;

/** Used when the opening packet carries no server time. */
const DEFAULT_SPLIT_SECONDS = 20;

export const EMPTY_LOOT_SPLIT_STATE: LootSplitState = {
  heroId: null,
  splits: [],
  ownSplitId: null,
  acceptRequested: false,
};

export const canPickMust = (profession: string, item: LootSplitItem) =>
  item.mustProfessions.length === 0 ||
  item.mustProfessions.includes(profession);

export const getLootSplitStatus = (
  split: LootSplit,
  characterId: string,
  heroId: string | null,
): LootSplitStatus => {
  const view = split.views[characterId];

  if (view?.accepted) return "accepted";

  if (!view && characterId !== heroId) return "unknown";

  // The game draws with the choices a player had when the time ran out.
  return split.phase === "expired" ? "timedOut" : "choosing";
};

// Game `states` values outside the known choices are ignored, not guessed.
const toChoices = (states: Readonly<Record<string, number>>) => {
  const choices: Record<string, LootSplitChoice> = {};

  for (const [id, state] of Object.entries(states)) {
    if (state === 0 || state === 1 || state === 2) choices[id] = state;
  }

  return choices;
};

const sameChoices = (
  left: Readonly<Record<string, LootSplitChoice>>,
  right: Readonly<Record<string, LootSplitChoice>>,
) => {
  const ids = Object.keys(left);

  return (
    ids.length === Object.keys(right).length &&
    ids.every((id) => left[id] === right[id])
  );
};

const parseMustProfessions = (stat: string) =>
  getItemStat(stat, "reqp")?.split("") ?? [];

/** The command's parameter for each choice: `want`, `not` and `must`. */
const COMMAND_CHOICES: ReadonlyArray<readonly [string, LootSplitChoice]> = [
  ["not", 0],
  ["want", 1],
  ["must", 2],
];

/**
 * The choices a `loot&want=…&not=…&must=…` command names. SI "nie chcę
 * wszystkiego" accepts with every item under `not` in one request, so the
 * accept carries choices the server may never echo.
 */
const parseCommandChoices = (command: string, split: LootSplit) => {
  const params = new URLSearchParams(command.slice(command.indexOf("&") + 1));
  const itemIds = new Set(split.items.map(({ id }) => id));
  const choices: Record<string, LootSplitChoice> = {};

  for (const [param, choice] of COMMAND_CHOICES) {
    for (const id of params.get(param)?.split(",") ?? []) {
      if (itemIds.has(id)) choices[id] = choice;
    }
  }

  return choices;
};

const replaceSplit = (
  state: LootSplitState,
  split: LootSplit,
): LootSplitState => ({
  ...state,
  splits: state.splits.map((current) =>
    current.id === split.id ? split : current,
  ),
});

const setView = (
  split: LootSplit,
  characterId: string,
  view: LootSplitView,
): LootSplit => ({
  ...split,
  views: { ...split.views, [characterId]: view },
});

const getOwnOpenSplit = (state: LootSplitState) => {
  const split = state.splits.find(({ id }) => id === state.ownSplitId);

  return split?.phase === "open" ? split : undefined;
};

const updateOwnView = (
  state: LootSplitState,
  update: (view: LootSplitView, split: LootSplit) => LootSplitView,
): LootSplitState => {
  const split = getOwnOpenSplit(state);
  const view = state.heroId ? split?.views[state.heroId] : undefined;

  if (!split || !state.heroId || !view) return state;

  const next = update(view, split);

  return next === view
    ? state
    : replaceSplit(state, setView(split, state.heroId, next));
};

/**
 * Starting a fight or receiving another loot closes the hero's loot window
 * without a request (NI `Battle.js` and `on_loot` call
 * `Loot.deleteItemsAndCloseLootWindow`, SI `lootWindow` and `closeLootWindow`);
 * the server then finalizes the hero's choices.
 */
const closeOwnWindow = (state: LootSplitState): LootSplitState => {
  const closed = updateOwnView(state, (view) =>
    view.accepted ? view : { ...view, accepted: true, inferred: true },
  );

  return { ...closed, ownSplitId: null, acceptRequested: false };
};

export type LootSplitContext = Readonly<{
  at: number;
  heroId: string;
  /** The party as the runtime knows it, for a packet that carries none. */
  party: readonly LootSplitParticipant[];
  /**
   * Character ids of the players in the fight that dropped the loot; party
   * members who stayed out of it take no part in the split.
   */
  fighters: ReadonlySet<string>;
}>;

const partyFromEvent = (
  event: GameEvent,
): readonly LootSplitParticipant[] | null =>
  event.party?.members
    ? Object.entries(event.party.members).map(([characterId, member]) => ({
        characterId,
        name: member.nick,
        profession: member.prof ?? "",
      }))
    : null;

const getParticipants = (
  event: GameEvent,
  { heroId, party, fighters }: LootSplitContext,
) => {
  const members = partyFromEvent(event) ?? party;

  if (event.loot?.source !== "fight" || fighters.size === 0) return members;

  return members.filter(
    ({ characterId }) => characterId === heroId || fighters.has(characterId),
  );
};

const openSplit = (
  state: LootSplitState,
  event: GameEvent,
  context: LootSplitContext,
): LootSplitState => {
  const loot = event.loot;
  const closed = closeOwnWindow({ ...state, heroId: context.heroId });

  // `init` counts the split's participants; one is a solo loot.
  if (!loot?.init || loot.init <= 1) return closed;

  const items = Object.entries(event.item ?? {})
    .filter(([, item]) => item.loc === "l")
    .map(([id, item]) => ({
      id,
      hid: item.hid,
      name: item.name,
      icon: item.icon,
      mustProfessions: parseMustProfessions(item.stat),
    }))
    .toSorted((left, right) => Number(left.id) - Number(right.id));

  const [first] = items;

  if (!first) return closed;

  const seconds =
    loot.endTs !== undefined && event.ev !== undefined
      ? loot.endTs - event.ev
      : DEFAULT_SPLIT_SECONDS;

  const split: LootSplit = {
    id: first.id,
    phase: "open",
    deadline: context.at + seconds * 1_000,
    closedAt: null,
    items,
    participants: getParticipants(event, context),
    views: {
      [context.heroId]: {
        choices: toChoices(loot.states),
        accepted: false,
        inferred: false,
      },
    },
  };

  return {
    ...closed,
    splits: [...closed.splits.filter(({ id }) => id !== split.id), split],
    ownSplitId: split.id,
  };
};

const updateOwnChoices = (
  state: LootSplitState,
  states: Readonly<Record<string, number>>,
) =>
  updateOwnView(state, (view) => {
    const choices = toChoices(states);

    // The answer to `final=1` repeats the states; nothing changed.
    return sameChoices(choices, view.choices) ? view : { ...view, choices };
  });

/**
 * Settles a requested accept with the server's next answer. NI keeps the
 * loot window open when that answer carries `w` (`Loot.finalize`), so the
 * hero has not accepted after all.
 */
const settleAccept = (
  state: LootSplitState,
  event: GameEvent,
): LootSplitState => {
  if (!state.acceptRequested) return state;

  if (Object.hasOwn(event, "w")) return { ...state, acceptRequested: false };

  if (!event.loot) return state;

  return {
    ...updateOwnView(state, (view) => ({ ...view, accepted: true })),
    acceptRequested: false,
  };
};

/** Matches a "Podział łupów" message to its split by the quoted item hashes. */
const resolveByDistribution = (
  state: LootSplitState,
  message: string,
  at: number,
): LootSplitState => {
  if (!message.includes("Podział łupów")) return state;

  return {
    ...state,
    splits: state.splits.map((split) =>
      split.phase === "open" &&
      split.items.some(({ hid }) => message.includes(`ITEM#${hid}`))
        ? { ...split, phase: "resolved", closedAt: at }
        : split,
    ),
  };
};

export const applyGameEvent = (
  state: LootSplitState,
  event: GameEvent,
  context: LootSplitContext,
): LootSplitState => {
  let next = state;

  if (event.loot?.init !== undefined) next = openSplit(next, event, context);
  // A reload delivers the fight and its loot in one packet; only a fight
  // without loot closes the window.
  else if (event.f?.init) next = closeOwnWindow(next);
  else if (event.loot?.states) next = updateOwnChoices(next, event.loot.states);

  next = settleAccept(next, event);

  for (const { msg } of event.chat?.channels?.system?.msg ?? []) {
    if (msg) next = resolveByDistribution(next, msg, context.at);
  }

  return next;
};

/**
 * Follows the hero's `loot&…` requests, the same on NI and SI. An accept
 * (`final=1`) takes the choices it names and waits for the server's answer.
 */
export const applyGameCommand = (
  state: LootSplitState,
  command: string,
): LootSplitState => {
  if (!command.startsWith("loot&") || !command.includes("&final=1"))
    return state;

  const split = getOwnOpenSplit(state);

  if (!split) return state;

  const named = updateOwnView(state, (view) => {
    if (view.accepted) return view;

    const choices = { ...view.choices, ...parseCommandChoices(command, split) };

    return sameChoices(choices, view.choices) ? view : { ...view, choices };
  });

  return { ...named, acceptRequested: true };
};

export const applyRemoteChoices = (
  state: LootSplitState,
  event: LootSplitEvent,
): LootSplitState => {
  const split = state.splits.find(({ id }) => id === event.splitId);
  const sender = event.sender.characterId;

  // Only a participant of an open split this client saw may fill it in.
  if (
    split?.phase !== "open" ||
    sender === state.heroId ||
    !split.participants.some(({ characterId }) => characterId === sender)
  )
    return state;

  return replaceSplit(
    state,
    setView(split, sender, {
      choices: event.choices,
      accepted: event.accepted,
      inferred: false,
    }),
  );
};

export const expireSplits = (
  state: LootSplitState,
  at: number,
): LootSplitState => {
  const splits = state.splits
    .map((split) =>
      split.phase === "open" && at >= split.deadline
        ? { ...split, phase: "expired" as const, closedAt: at }
        : split,
    )
    .filter(
      ({ closedAt }) =>
        closedAt === null || at - closedAt < CLOSED_SPLIT_LINGER_MS,
    );

  const changed =
    splits.length !== state.splits.length ||
    splits.some((split, index) => split !== state.splits[index]);

  return changed ? { ...state, splits } : state;
};

/** Splits whose hero view changed, so the hero's choices must be shared. */
export const changedOwnSplits = (
  previous: LootSplitState,
  next: LootSplitState,
): LootSplit[] => {
  const heroId = next.heroId;

  if (!heroId) return [];

  return next.splits.filter((split) => {
    const before = previous.splits.find(({ id }) => id === split.id);

    return (
      split.views[heroId] !== undefined &&
      before?.views[heroId] !== split.views[heroId]
    );
  });
};

/** Open splits in which the hero has a view, to share again after reconnecting. */
export const openOwnSplits = (state: LootSplitState): LootSplit[] =>
  state.splits.filter(
    (split) =>
      split.phase === "open" &&
      state.heroId !== null &&
      split.views[state.heroId] !== undefined,
  );
