/** Where a player meets the change, in the order filters list them. */
export const CHANGELOG_SURFACES = [
  "game-client",
  "web",
  "wiki",
  "discord",
] as const;

export type ChangelogSurface = (typeof CHANGELOG_SURFACES)[number];

export const CHANGELOG_ENTRY_TYPES = ["feature", "improvement", "fix"] as const;

export type ChangelogEntryType = (typeof CHANGELOG_ENTRY_TYPES)[number];

/**
 * One change a player can notice, written in Polish in the pull request that
 * ships it. A change nobody can notice gets no entry.
 */
export type ChangelogEntry = (
  | {
      type: Exclude<ChangelogEntryType, "fix">;
      /**
       * Marks the entry unread until the player opens the list. Reserve it
       * for something a player would not find alone.
       */
      highlight?: boolean;
    }
  | { type: "fix"; highlight?: never }
) & {
  /** The day the change merged, as `YYYY-MM-DD`. */
  date: string;
  surfaces: readonly ChangelogSurface[];
  title: string;
  /** One or two sentences on what the player can do now. */
  summary?: string;
  /** The player guide page that explains the change, as its slug. */
  docs?: string;
};

/** An entry with the identity its file name gives it. */
export type ChangelogItem = ChangelogEntry & { id: string };

export type ChangelogWeek = {
  /** The Monday the week starts on, as `YYYY-MM-DD`. */
  weekStart: string;
  /** Features and improvements, newest first. */
  entries: ChangelogItem[];
  fixes: ChangelogItem[];
};

const DAY_MS = 86_400_000;

const toIsoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

/** The Monday of the calendar week `date` falls in. */
export const getWeekStart = (date: string) => {
  const time = Date.parse(`${date}T00:00:00Z`);
  const daysSinceMonday = (new Date(time).getUTCDay() + 6) % 7;

  return toIsoDate(time - daysSinceMonday * DAY_MS);
};

/** The Sunday that closes the week starting on `weekStart`. */
export const getWeekEnd = (weekStart: string) =>
  toIsoDate(Date.parse(`${weekStart}T00:00:00Z`) + 6 * DAY_MS);

/** Whether `weekStart` opens the week the player's own calendar is in. */
export const isCurrentWeek = (weekStart: string, now = new Date()) => {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return weekStart === getWeekStart(`${now.getFullYear()}-${month}-${day}`);
};

/** The days of a week, such as "10–16 listopada". */
export const formatWeekRange = (weekStart: string, locale: string) => {
  const start = new Date(weekStart);
  const end = new Date(getWeekEnd(weekStart));

  const dayAndMonth = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  // A week inside one month names the month once.
  return start.getUTCMonth() === end.getUTCMonth()
    ? `${start.getUTCDate()}–${dayAndMonth.format(end)}`
    : `${dayAndMonth.format(start)} – ${dayAndMonth.format(end)}`;
};

/** The day an entry merged, such as "18 lis". */
export const formatChangelogDay = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));

export type ChangelogFilters = {
  /** Keeps entries met on any of these surfaces; empty keeps every surface. */
  surfaces: readonly ChangelogSurface[];
  /** Keeps entries of these types; empty keeps every type. */
  types: readonly ChangelogEntryType[];
  /** Keeps entries whose title or summary contains the phrase. */
  search: string;
};

/** The entries the player's filters leave. */
export const filterChangelog = (
  items: readonly ChangelogItem[],
  { surfaces, types, search }: ChangelogFilters,
) => {
  const phrase = search.trim().toLocaleLowerCase();

  return items.filter(
    (item) =>
      (surfaces.length === 0 ||
        item.surfaces.some((surface) => surfaces.includes(surface))) &&
      (types.length === 0 || types.includes(item.type)) &&
      (phrase === "" ||
        `${item.title} ${item.summary ?? ""}`
          .toLocaleLowerCase()
          .includes(phrase)),
  );
};

// Among the changes of one day, what a player would not find alone leads,
// then what is new, then what got better.
const getDayRank = (item: ChangelogItem) => {
  if (item.highlight) return 0;

  return item.type === "feature" ? 1 : 2;
};

/** Weeks from the newest, each with its changes from the newest. */
export const groupChangelogByWeek = (
  items: readonly ChangelogItem[],
): ChangelogWeek[] => {
  const weeks = new Map<string, ChangelogWeek>();

  const newestFirst = [...items].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      getDayRank(a) - getDayRank(b) ||
      a.id.localeCompare(b.id),
  );

  for (const item of newestFirst) {
    const weekStart = getWeekStart(item.date);
    const week = weeks.get(weekStart) ?? { weekStart, entries: [], fixes: [] };

    (item.type === "fix" ? week.fixes : week.entries).push(item);
    weeks.set(weekStart, week);
  }

  return [...weeks.values()];
};

const getHighlightIds = (items: readonly ChangelogItem[]) =>
  items.flatMap((item) => (item.highlight ? [item.id] : []));

/**
 * The highlights the player has not opened yet. A player with no record has
 * just arrived, so the backlog is not news to them.
 */
export const getUnreadHighlightIds = (
  items: readonly ChangelogItem[],
  seenIds: readonly string[] | null,
) =>
  seenIds === null
    ? []
    : getHighlightIds(items).filter((id) => !seenIds.includes(id));

/**
 * The seen record after the player opens the list. It keeps ids it does not
 * know, so a build older than the one that wrote them cannot unread them.
 */
export const markHighlightsSeen = (
  items: readonly ChangelogItem[],
  seenIds: readonly string[] | null,
) => [...new Set([...(seenIds ?? []), ...getHighlightIds(items)])];
