/** Where a player meets the change. */
export type ChangelogSurface = "game-client" | "web" | "discord" | "wiki";

export type ChangelogEntryType = "feature" | "improvement" | "fix";

/**
 * One change a player can notice, written in Polish in the pull request that
 * ships it. A change nobody can notice gets no entry.
 */
export type ChangelogEntry = {
  /** The day the change merged, as `YYYY-MM-DD`. */
  date: string;
  type: ChangelogEntryType;
  /**
   * Marks the entry unread until the player opens the list. Reserve it for
   * something a player would not find alone; fixes never carry it.
   */
  highlight?: boolean;
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
  /** Features and improvements, highlights first. */
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
export const isCurrentWeek = (weekStart: string, now = new Date()) =>
  weekStart === getWeekStart(now.toLocaleDateString("en-CA"));

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

const highlightsFirst = (a: ChangelogItem, b: ChangelogItem) =>
  Number(b.highlight ?? false) - Number(a.highlight ?? false);

/** Weeks from the newest, each led by its highlights. */
export const groupChangelogByWeek = (
  items: readonly ChangelogItem[],
): ChangelogWeek[] => {
  const weeks = new Map<string, ChangelogWeek>();

  const newestFirst = [...items].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      highlightsFirst(a, b) ||
      a.id.localeCompare(b.id),
  );

  for (const item of newestFirst) {
    const weekStart = getWeekStart(item.date);
    const week = weeks.get(weekStart) ?? { weekStart, entries: [], fixes: [] };

    (item.type === "fix" ? week.fixes : week.entries).push(item);
    weeks.set(weekStart, week);
  }

  return [...weeks.values()].map((week) => ({
    ...week,
    entries: week.entries.sort(highlightsFirst),
  }));
};

export const getHighlightIds = (items: readonly ChangelogItem[]) =>
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
