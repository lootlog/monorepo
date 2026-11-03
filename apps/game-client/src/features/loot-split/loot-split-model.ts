import type { GameEvent } from "@lootlog/margonem/game-events";
import type {
  LootSplitChoice,
  LootSplitEvent,
} from "@lootlog/schema/loot-split";

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
  /** Accepted by the game itself, when a new fight closed the window. */
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
}>;

export type LootSplitStatus = "accepted" | "choosing" | "unknown";

/** Closed splits stay listed this long, so their outcome can be read. */
export const CLOSED_SPLIT_LINGER_MS = 6_000;

/** Used when the opening packet carries no server time. */
const DEFAULT_SPLIT_SECONDS = 20;

export const EMPTY_LOOT_SPLIT_STATE: LootSplitState = {
  heroId: null,
  splits: [],
  ownSplitId: null,
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

  return view || characterId === heroId ? "choosing" : "unknown";
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
  stat
    .split(";")
    .find((part) => part.startsWith("reqp="))
    ?.slice("reqp=".length)
    .split("") ?? [];

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

/**
 * A new fight closes the hero's loot window without a request (NI
 * `Loot.deleteItemsAndCloseLootWindow`, SI `closeLootWindow`); the server
 * then finalizes the hero's choices, so the hero no longer holds it up.
 */
const acceptPreviousOwnSplit = (state: LootSplitState): LootSplitState => {
  const split = getOwnOpenSplit(state);
  const view = state.heroId ? split?.views[state.heroId] : undefined;

  if (!split || !state.heroId || !view || view.accepted) return state;

  return replaceSplit(
    state,
    setView(split, state.heroId, { ...view, accepted: true, inferred: true }),
  );
};

export type LootSplitContext = Readonly<{
  at: number;
  heroId: string;
  /** The party as the runtime knows it, for a packet that carries none. */
  party: readonly LootSplitParticipant[];
}>;

const openSplit = (
  state: LootSplitState,
  event: GameEvent,
  { at, heroId, party }: LootSplitContext,
): LootSplitState => {
  const loot = event.loot;

  // `init` counts the split's participants; one is a solo loot.
  if (!loot?.init || loot.init <= 1) return state;

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

  if (!first) return state;

  const seconds =
    loot.endTs !== undefined && event.ev !== undefined
      ? loot.endTs - event.ev
      : DEFAULT_SPLIT_SECONDS;

  const split: LootSplit = {
    id: first.id,
    phase: "open",
    deadline: at + seconds * 1_000,
    closedAt: null,
    items,
    participants: partyFromEvent(event) ?? party,
    views: {
      [heroId]: {
        choices: toChoices(loot.states),
        accepted: false,
        inferred: false,
      },
    },
  };

  const previous = acceptPreviousOwnSplit({ ...state, heroId });

  return {
    ...previous,
    splits: [...previous.splits.filter(({ id }) => id !== split.id), split],
    ownSplitId: split.id,
  };
};

const updateOwnChoices = (
  state: LootSplitState,
  states: Readonly<Record<string, number>>,
): LootSplitState => {
  const split = getOwnOpenSplit(state);
  const view = state.heroId ? split?.views[state.heroId] : undefined;

  if (!split || !state.heroId || !view) return state;

  const choices = toChoices(states);

  // The answer to `final=1` repeats the states; nothing changed.
  if (sameChoices(choices, view.choices)) return state;

  return replaceSplit(
    state,
    setView(split, state.heroId, { ...view, choices }),
  );
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
  else if (event.loot?.states) next = updateOwnChoices(next, event.loot.states);

  for (const { msg } of event.chat?.channels?.system?.msg ?? []) {
    if (msg) next = resolveByDistribution(next, msg, context.at);
  }

  return next;
};

/** NI and SI both accept with a `loot&…&final=1` request. */
export const applyGameCommand = (
  state: LootSplitState,
  command: string,
): LootSplitState => {
  if (!command.startsWith("loot&") || !command.includes("&final=1"))
    return state;

  const split = getOwnOpenSplit(state);
  const view = state.heroId ? split?.views[state.heroId] : undefined;

  if (!split || !state.heroId || !view || view.accepted) return state;

  return replaceSplit(
    state,
    setView(split, state.heroId, { ...view, accepted: true }),
  );
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
