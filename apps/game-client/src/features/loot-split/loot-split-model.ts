import type { GameEvent } from "@lootlog/margonem/game-events";
import { ItemRarityEnum } from "@lootlog/schema/item-rarity";
import { partition } from "es-toolkit";
import type {
  LootSplitChoice,
  LootSplitEvent,
} from "@lootlog/schema/loot-split";
import { itemStatValue } from "@lootlog/domain/item-stat";

type LootSplitParticipant = Readonly<{
  characterId: string;
  name: string;
}>;

export type LootSplitItem = Readonly<{
  id: string;
  hid: string;
  name: string;
  icon: string;
  rarity: ItemRarityEnum | null;
}>;

type LootSplitView = Readonly<{
  choices: Readonly<Record<string, LootSplitChoice>>;
  accepted: boolean;
  autoAccept: "newFight" | "lootFilter" | null;
}>;

export type LootSplit = Readonly<{
  id: string;
  phase: "open" | "resolved" | "expired";
  openedAt: number;
  deadline: number;
  closedAt: number | null;
  items: readonly LootSplitItem[];
  fromFight: boolean;
  participants: readonly LootSplitParticipant[];
  views: Readonly<Record<string, LootSplitView>>;
}>;

export type LootSplitState = Readonly<{
  heroId: string | null;
  splits: readonly LootSplit[];
  ownSplitId: string | null;
  acceptRequested: boolean;
  pendingFilterAccepts: ReadonlyArray<
    Readonly<{ characterId: string; at: number }>
  >;
}>;

export type LootSplitStatus = "accepted" | "choosing" | "timedOut" | "unknown";

export const CLOSED_SPLIT_LINGER_MS = 2_000;

const DEFAULT_SPLIT_SECONDS = 20;

const PENDING_FILTER_ACCEPT_MS = 5_000;

export const EMPTY_LOOT_SPLIT_STATE: LootSplitState = {
  heroId: null,
  splits: [],
  ownSplitId: null,
  acceptRequested: false,
  pendingFilterAccepts: [],
};

export const getLootSplitStatus = (
  split: LootSplit,
  characterId: string,
  heroId: string | null,
): LootSplitStatus => {
  const view = split.views[characterId];

  if (view?.accepted) return "accepted";

  if (!view && characterId !== heroId) return "unknown";

  return split.phase === "expired" ? "timedOut" : "choosing";
};

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

const RARITY_BY_STAT = new Map<string, ItemRarityEnum>([
  ["unique", ItemRarityEnum.UNIQUE],
  ["heroic", ItemRarityEnum.HEROIC],
  ["upgraded", ItemRarityEnum.UPGRADED],
  ["legendary", ItemRarityEnum.LEGENDARY],
]);

const parseRarity = (stat: string) =>
  RARITY_BY_STAT.get(itemStatValue(stat, "rarity") ?? "") ?? null;

export const splitDropsRarity = (
  split: LootSplit,
  rarities: readonly ItemRarityEnum[],
) => {
  if (rarities.length === 0) return true;

  const wanted = new Set(rarities);

  return split.items.some(
    ({ rarity }) => rarity !== null && wanted.has(rarity),
  );
};

const COMMAND_CHOICES: ReadonlyArray<readonly [string, LootSplitChoice]> = [
  ["not", 0],
  ["want", 1],
  ["must", 2],
];

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

const closeOwnWindow = (state: LootSplitState): LootSplitState => {
  const closed = updateOwnView(state, (view) =>
    view.accepted ? view : { ...view, accepted: true, autoAccept: "newFight" },
  );

  return { ...closed, ownSplitId: null, acceptRequested: false };
};

export type LootSplitContext = Readonly<{
  at: number;
  heroId: string;
  party: readonly LootSplitParticipant[];
  fighters: ReadonlySet<string>;
}>;

const partyFromEvent = (
  event: GameEvent,
): readonly LootSplitParticipant[] | null =>
  event.party?.members
    ? Object.entries(event.party.members).map(([characterId, member]) => ({
        characterId,
        name: member.nick,
      }))
    : null;

const getFighters = (event: GameEvent, context: LootSplitContext) =>
  event.f?.w
    ? new Set(Object.keys(event.f.w).filter((id) => !id.startsWith("-")))
    : context.fighters;

const getParticipants = (
  members: readonly LootSplitParticipant[],
  fromFight: boolean,
  { heroId, fighters }: LootSplitContext,
) =>
  !fromFight || fighters.size === 0
    ? members
    : members.filter(
        ({ characterId }) =>
          characterId === heroId || fighters.has(characterId),
      );

const resumeSplit = (
  state: LootSplitState,
  split: LootSplit,
  event: GameEvent,
  context: LootSplitContext,
): LootSplitState => {
  const loot = event.loot;
  const view = split.views[context.heroId];
  const choices = toChoices(loot?.states ?? {});

  const resumed: LootSplit = {
    ...split,
    deadline:
      loot?.endTs !== undefined && event.ev !== undefined
        ? context.at + (loot.endTs - event.ev) * 1_000
        : split.deadline,
    views:
      view && sameChoices(choices, view.choices)
        ? split.views
        : {
            ...split.views,
            [context.heroId]: {
              ...(view ?? { accepted: false, autoAccept: null }),
              choices,
            },
          },
  };

  return {
    ...replaceSplit(state, resumed),
    ownSplitId: split.id,
  };
};

const openSplit = (
  state: LootSplitState,
  event: GameEvent,
  context: LootSplitContext,
): LootSplitState => {
  const loot = event.loot;

  const grouped = loot?.init !== undefined && loot.init > 1;

  const items = Object.entries(event.item ?? {})
    .filter(([, item]) => item.loc === "l")
    .map(([id, item]) => ({
      id,
      hid: item.hid,
      name: item.name,
      icon: item.icon,
      rarity: parseRarity(item.stat),
    }))
    .toSorted((left, right) => Number(left.id) - Number(right.id));

  const [first] = items;
  const known = state.splits.find(({ id }) => id === first?.id);

  if (grouped && known?.phase === "open")
    return resumeSplit(
      { ...state, heroId: context.heroId },
      known,
      event,
      context,
    );

  const closed = closeOwnWindow({ ...state, heroId: context.heroId });

  if (!loot || !grouped || !first) return closed;

  const seconds =
    loot.endTs !== undefined && event.ev !== undefined
      ? loot.endTs - event.ev
      : DEFAULT_SPLIT_SECONDS;

  const fromFight = loot.source === "fight";

  const split: LootSplit = {
    id: first.id,
    phase: "open",
    openedAt: context.at,
    deadline: context.at + seconds * 1_000,
    closedAt: null,
    items,
    fromFight,
    participants: getParticipants(
      partyFromEvent(event) ?? context.party,
      fromFight,
      context,
    ),
    views: {
      [context.heroId]: {
        choices: toChoices(loot.states),
        accepted: false,
        autoAccept: null,
      },
    },
  };

  const isParticipant = (characterId: string) =>
    split.participants.some(
      (participant) => participant.characterId === characterId,
    );

  const [early, pending] = partition(
    closed.pendingFilterAccepts,
    ({ characterId, at }) =>
      isParticipant(characterId) && context.at - at < PENDING_FILTER_ACCEPT_MS,
  );

  return {
    ...closed,
    splits: [
      ...closed.splits.filter(({ id }) => id !== split.id),
      early.reduce(
        (opened, { characterId }) =>
          setView(opened, characterId, FILTER_ACCEPTED_VIEW),
        split,
      ),
    ],
    ownSplitId: split.id,
    pendingFilterAccepts: pending,
  };
};

const updateOwnChoices = (
  state: LootSplitState,
  states: Readonly<Record<string, number>>,
) =>
  updateOwnView(state, (view) => {
    const choices = toChoices(states);

    return sameChoices(choices, view.choices) ? view : { ...view, choices };
  });

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

const FILTER_ACCEPTED_VIEW: LootSplitView = {
  choices: {},
  accepted: true,
  autoAccept: "lootFilter",
};

const DROP_LOG_PATTERN = /^0;0;txt=.+: zdobyto /u;

export const ownLootFilterAcceptRecipients = (
  event: GameEvent,
  context: LootSplitContext,
): string[] | null => {
  if (event.loot?.init !== undefined) return null;

  if (!event.f?.m?.some((line) => DROP_LOG_PATTERN.test(line))) return null;

  const others = [...getFighters(event, context)].filter(
    (characterId) => characterId !== context.heroId,
  );

  return others.length > 0 ? others : null;
};

export const applyRemoteFilterAccept = (
  state: LootSplitState,
  characterId: string,
  at: number,
): LootSplitState => {
  if (characterId === state.heroId) return state;

  const split = state.splits.findLast(
    (candidate) =>
      candidate.phase === "open" &&
      !candidate.views[characterId]?.accepted &&
      candidate.participants.some(
        (participant) => participant.characterId === characterId,
      ),
  );

  if (!split)
    return {
      ...state,
      pendingFilterAccepts: [
        ...state.pendingFilterAccepts.filter(
          (pending) => pending.characterId !== characterId,
        ),
        { characterId, at },
      ],
    };

  return replaceSplit(state, setView(split, characterId, FILTER_ACCEPTED_VIEW));
};

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
        ? {
            ...split,
            phase: at >= split.deadline ? "expired" : "resolved",
            closedAt: at,
          }
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
  else if (event.f?.init) next = closeOwnWindow(next);
  else if (event.loot?.states) next = updateOwnChoices(next, event.loot.states);

  next = settleAccept(next, event);

  for (const { msg } of event.chat?.channels?.system?.msg ?? []) {
    if (msg) next = resolveByDistribution(next, msg, context.at);
  }

  return next;
};

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
      autoAccept: null,
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

  const pendingFilterAccepts = state.pendingFilterAccepts.filter(
    (pending) => at - pending.at < PENDING_FILTER_ACCEPT_MS,
  );

  const changed =
    splits.length !== state.splits.length ||
    splits.some((split, index) => split !== state.splits[index]) ||
    pendingFilterAccepts.length !== state.pendingFilterAccepts.length;

  return changed ? { ...state, splits, pendingFilterAccepts } : state;
};

export const fillParticipants = (
  state: LootSplitState,
  context: LootSplitContext,
): LootSplitState => {
  const unknownParty = (split: LootSplit) =>
    split.phase === "open" &&
    split.participants.every(
      ({ characterId }) => characterId === context.heroId,
    );

  if (!state.splits.some(unknownParty)) return state;

  const splits = state.splits.map((split) => {
    if (!unknownParty(split)) return split;

    const participants = getParticipants(
      context.party,
      split.fromFight,
      context,
    );

    return participants.some(
      ({ characterId }) => characterId !== context.heroId,
    )
      ? { ...split, participants }
      : split;
  });

  return splits.every((split, index) => split === state.splits[index])
    ? state
    : { ...state, splits };
};

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

export const openOwnSplits = (state: LootSplitState): LootSplit[] =>
  state.splits.filter(
    (split) =>
      split.phase === "open" &&
      state.heroId !== null &&
      split.views[state.heroId] !== undefined,
  );
