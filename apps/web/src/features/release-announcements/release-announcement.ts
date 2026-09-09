import releases from "../../../../docs/generated/changelog-releases.json";

interface ReleaseAnnouncement {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly publishedAt: string;
  readonly bodyMarkdown: string;
}

const latestRelease = releases[0];
if (latestRelease === undefined) {
  throw new Error("The generated changelog catalog is empty");
}

export const latestReleaseAnnouncement: ReleaseAnnouncement = latestRelease;
