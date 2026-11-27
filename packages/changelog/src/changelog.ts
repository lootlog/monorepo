export const CHANGELOG_SURFACES = [
  "game-client",
  "web",
  "wiki",
  "discord",
] as const;

export type ChangelogSurface = (typeof CHANGELOG_SURFACES)[number];

export const CHANGELOG_ENTRY_TYPES = ["feature", "improvement", "fix"] as const;

export type ChangelogEntryType = (typeof CHANGELOG_ENTRY_TYPES)[number];

export type ChangelogEntry = (
  | {
      type: Exclude<ChangelogEntryType, "fix">;
      highlight?: boolean;
    }
  | { type: "fix"; highlight?: never }
) & {
  date: string;
  surfaces: readonly ChangelogSurface[];
  title: string;
  summary?: string;
  docs?: string;
};

export type ChangelogItem = ChangelogEntry & { id: string };

export type ChangelogWeek = {
  weekStart: string;
  entries: ChangelogItem[];
  fixes: ChangelogItem[];
};

const DAY_MS = 86_400_000;

const toIsoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

export const getWeekStart = (date: string) => {
  const time = Date.parse(`${date}T00:00:00Z`);
  const daysSinceMonday = (new Date(time).getUTCDay() + 6) % 7;

  return toIsoDate(time - daysSinceMonday * DAY_MS);
};

export const getWeekEnd = (weekStart: string) =>
  toIsoDate(Date.parse(`${weekStart}T00:00:00Z`) + 6 * DAY_MS);

export const isCurrentWeek = (weekStart: string, now = new Date()) => {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return weekStart === getWeekStart(`${now.getFullYear()}-${month}-${day}`);
};

export const formatWeekRange = (weekStart: string, locale: string) => {
  const start = new Date(weekStart);
  const end = new Date(getWeekEnd(weekStart));

  const dayAndMonth = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  return start.getUTCMonth() === end.getUTCMonth()
    ? `${start.getUTCDate()}–${dayAndMonth.format(end)}`
    : `${dayAndMonth.format(start)} – ${dayAndMonth.format(end)}`;
};

export const formatChangelogDay = (date: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));

export type ChangelogFilters = {
  surfaces: readonly ChangelogSurface[];
  types: readonly ChangelogEntryType[];
  search: string;
};

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

const getDayRank = (item: ChangelogItem) => {
  if (item.highlight) return 0;

  return item.type === "feature" ? 1 : 2;
};

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

const getAnnouncedIds = (items: readonly ChangelogItem[]) =>
  items.flatMap((item) => (item.type === "fix" ? [] : [item.id]));

export const getUnreadIds = (
  items: readonly ChangelogItem[],
  seenIds: readonly string[] | null,
) =>
  seenIds === null
    ? []
    : getAnnouncedIds(items).filter((id) => !seenIds.includes(id));

export const markSeen = (
  items: readonly ChangelogItem[],
  seenIds: readonly string[] | null,
) => [...new Set([...(seenIds ?? []), ...getAnnouncedIds(items)])];
