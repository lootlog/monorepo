import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, "..");
const outputDirectory = path.join(root, "apps/docs/content/docs/changelog");
const manifestPath = path.join(root, "changelog.releases.json");
const catalogPath = path.join(
  root,
  "apps/docs/generated/changelog-releases.json",
);
const shaPattern = /^[0-9a-f]{40}$/u;
const slugPattern = /^\d{4}-\d{2}-\d{2}$/u;
const releaseDefinitionSchema = z.object({
  base: z.string().regex(shaPattern),
  description: z.string(),
  head: z.string().regex(shaPattern),
  publishedAt: z.string(),
  slug: z.string().regex(slugPattern),
  title: z.string(),
});
const releaseSchema = releaseDefinitionSchema.extend({
  bodyMarkdown: z.string(),
});

await mkdir(path.dirname(catalogPath), { recursive: true });

const definitions = z
  .array(releaseDefinitionSchema)
  .min(1, "changelog.releases.json must contain at least one release")
  .parse(JSON.parse(await readFile(manifestPath, "utf8")));

const previousCatalog = await readFile(catalogPath, "utf8")
  .then((contents) => z.array(releaseSchema).parse(JSON.parse(contents)))
  .catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });

for (const release of previousCatalog) {
  if (slugPattern.test(release.slug)) {
    await rm(path.join(outputDirectory, `${release.slug}.mdx`), {
      force: true,
    });
  }
}

const releases = [];
for (const definition of definitions) {
  const { base, description, head, publishedAt, slug, title } = definition;
  if (publishedAt !== slug) {
    throw new Error(
      `Invalid changelog release definition: ${JSON.stringify(definition)}`,
    );
  }

  let bodyMarkdown;
  try {
    ({ stdout: bodyMarkdown } = await execFileAsync(
      "git-cliff",
      ["--config", "cliff.toml", "--ignore-tags", ".*", `${base}..${head}`],
      { cwd: root, maxBuffer: 10 * 1024 * 1024 },
    ));
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        "git-cliff is required to generate changelogs: https://git-cliff.org/docs/installation/",
        { cause: error },
      );
    }
    throw error;
  }

  bodyMarkdown = bodyMarkdown
    .trim()
    .replace(/^## (.+)\n(?!\n)/gmu, "## $1\n\n")
    .replace(/\n{3,}/gu, "\n\n");
  if (bodyMarkdown.length === 0) {
    bodyMarkdown =
      "No user-facing conventional commits were found in this range.";
  }

  const release = {
    slug,
    title,
    description,
    publishedAt,
    bodyMarkdown,
    base,
    head,
  };
  releases.push(release);

  const page = `---\ntitle: ${title}\ndescription: ${description}\npublishedAt: ${publishedAt}\n---\n\n${bodyMarkdown}\n`;
  await writeFile(path.join(outputDirectory, `${slug}.mdx`), page);
}

await writeFile(catalogPath, `${JSON.stringify(releases, null, 2)}\n`);
await writeFile(
  path.join(outputDirectory, "meta.json"),
  `${JSON.stringify({ title: "Changelog", pages: releases.map(({ slug }) => slug) }, null, 2)}\n`,
);

process.stdout.write(`Generated ${releases.length} changelog releases.\n`);
