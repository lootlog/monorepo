import { source } from "@/lib/source";

export type ChangelogEntry = {
  readonly publishedAt: string;
  readonly slug: string;
  readonly title: string;
  readonly url: string;
};

export function getChangelogEntries(): ChangelogEntry[] {
  return source
    .getPages()
    .filter((page) => page.slugs[0] === "changelog" && page.slugs.length === 2)
    .map((page) => {
      const publishedAt = page.data.publishedAt;
      const slug = page.slugs[1];
      if (publishedAt === undefined || slug === undefined) {
        throw new Error(`Invalid changelog entry metadata: ${page.path}`);
      }

      return {
        publishedAt,
        slug,
        title: page.data.title,
        url: page.url,
      };
    })
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}
