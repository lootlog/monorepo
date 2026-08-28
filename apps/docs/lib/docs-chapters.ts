export const docsChapters = [
  {
    id: "start",
    number: "01",
    label: "Start",
    color: "#35d3e4",
    separator: "01 · Start",
    slugs: ["index", "installation", "getting-started"],
  },
  {
    id: "addon",
    number: "02",
    label: "Addon",
    color: "#c8f135",
    separator: "02 · Addon",
    slugs: ["features"],
  },
  {
    id: "panel",
    number: "03",
    label: "Panel",
    color: "#3157f6",
    separator: "03 · Panel",
    slugs: ["web-panel", "battle-panel", "battle-panel-mechanics"],
  },
  {
    id: "clan",
    number: "04",
    label: "Clan",
    color: "#ffbd3f",
    separator: "04 · Clan",
    slugs: ["clan-features", "events", "permissions", "settings"],
  },
  {
    id: "help",
    number: "05",
    label: "Help",
    color: "#ff665b",
    separator: "05 · Help",
    slugs: ["faq"],
  },
] as const;

export type DocsChapter = (typeof docsChapters)[number];
export type DocsChapterId = DocsChapter["id"];

export const docsSlugs = docsChapters.flatMap((chapter) => chapter.slugs);

export function getDocsPath(slug: string): string {
  return slug === "index" ? "/docs" : `/docs/${slug}`;
}

export const docsPaths = docsSlugs.map(getDocsPath);

export function getChapterBySlug(slug?: string[]): DocsChapter {
  const pageSlug = slug?.[0] ?? "index";

  return (
    docsChapters.find((chapter) =>
      chapter.slugs.some((chapterSlug) => chapterSlug === pageSlug),
    ) ?? docsChapters[0]
  );
}

export function getChapterBySeparator(
  separator: unknown,
): DocsChapter | undefined {
  if (typeof separator !== "string") {
    return undefined;
  }

  return docsChapters.find((chapter) => chapter.separator === separator);
}
