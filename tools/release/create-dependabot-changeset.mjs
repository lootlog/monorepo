import { isDeepStrictEqual } from "node:util";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const runtimeDependencyFields = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
];
const developmentDependencyFields = ["devDependencies"];
const dependencyFields = [
  ...runtimeDependencyFields,
  ...developmentDependencyFields,
];
const workspaceManifestPattern = /^(apps|packages)\/[^/]+\/package\.json$/;
const githubActionsWorkflowPattern = /^\.github\/workflows\/[^/]+\.ya?ml$/;
const githubActionUsePattern =
  /^(?<prefix>\s*(?:-\s*)?uses:\s*["']?)(?<action>[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_./-]+)?)@(?<ref>[^"'#\s]+)(?<suffix>["']?\s*(?:#.*)?)$/;

function withoutDependencyFields(manifest) {
  return Object.fromEntries(
    Object.entries(manifest).filter(([key]) => !dependencyFields.includes(key)),
  );
}

function changedAnyField(before, after, fields) {
  return fields.some(
    (field) => !isDeepStrictEqual(before[field] ?? {}, after[field] ?? {}),
  );
}

export function createDependabotChangeset({
  catalogChanges = {
    hasDevelopmentChanges: false,
    runtimePackages: [],
  },
  changedManifests,
  hasToolingChanges = false,
  pullRequestNumber,
}) {
  if (!Array.isArray(changedManifests)) {
    throw new TypeError("Changed manifests must be an array");
  }
  if (!Number.isInteger(pullRequestNumber) || pullRequestNumber <= 0) {
    throw new TypeError("Pull request number must be a positive integer");
  }
  if (
    !Array.isArray(catalogChanges.runtimePackages) ||
    typeof catalogChanges.hasDevelopmentChanges !== "boolean"
  ) {
    throw new TypeError("Catalog changes must contain classified dependencies");
  }
  if (
    changedManifests.length === 0 &&
    catalogChanges.runtimePackages.length === 0 &&
    !catalogChanges.hasDevelopmentChanges &&
    !hasToolingChanges
  ) {
    return null;
  }

  const runtimePackages = new Set(catalogChanges.runtimePackages);
  let hasDevelopmentChanges = catalogChanges.hasDevelopmentChanges;

  for (const { after, before, path } of changedManifests) {
    const isRootManifest = path === "package.json";
    const isWorkspaceManifest = path?.match(workspaceManifestPattern);
    if (
      (!isRootManifest && !isWorkspaceManifest) ||
      !before ||
      !after ||
      before.name !== after.name ||
      (!isRootManifest && !after.name?.startsWith("@lootlog/"))
    ) {
      throw new Error(`Cannot classify Dependabot changes in ${path}`);
    }

    if (
      !isDeepStrictEqual(
        withoutDependencyFields(before),
        withoutDependencyFields(after),
      )
    ) {
      throw new Error(`Cannot classify Dependabot changes in ${path}`);
    }

    const hasRuntimeChanges = changedAnyField(
      before,
      after,
      runtimeDependencyFields,
    );
    const hasDevChanges = changedAnyField(
      before,
      after,
      developmentDependencyFields,
    );

    if (!hasRuntimeChanges && !hasDevChanges) {
      throw new Error(`Cannot classify Dependabot changes in ${path}`);
    }
    if (isRootManifest && hasRuntimeChanges) {
      throw new Error(`Cannot classify Dependabot changes in ${path}`);
    }
    if (hasRuntimeChanges) {
      runtimePackages.add(after.name);
    }
    hasDevelopmentChanges ||= hasDevChanges;
  }

  const filename = `.changeset/dependabot-pr-${pullRequestNumber}.md`;
  if (runtimePackages.size > 0) {
    const releases = [...runtimePackages]
      .sort()
      .map((packageName) => `"${packageName}": patch`);
    return {
      content: [
        "---",
        ...releases,
        "---",
        "",
        "Update runtime dependencies.",
        "",
      ].join("\n"),
      filename,
    };
  }

  if (hasDevelopmentChanges || hasToolingChanges) {
    return {
      content: [
        "---",
        "---",
        "",
        "Update development and tooling dependencies.",
        "",
      ].join("\n"),
      filename,
    };
  }

  return null;
}

function readCatalogEntries(contents, path) {
  const entries = new Map();
  const lines = contents.split(/\r?\n/);
  let catalogFound = false;
  let insideCatalog = false;

  for (const [index, line] of lines.entries()) {
    if (line === "catalog:") {
      if (catalogFound) {
        throw new Error(`Cannot classify Dependabot changes in ${path}`);
      }
      catalogFound = true;
      insideCatalog = true;
      continue;
    }

    if (!insideCatalog) {
      continue;
    }
    if (line.length > 0 && !line.startsWith(" ")) {
      insideCatalog = false;
      continue;
    }
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      continue;
    }

    const entry = line.match(
      /^ {2}(?:"([^"]+)"|'([^']+)'|([^"'#:][^:]*)):\s*(\S.*)$/,
    );
    if (!entry) {
      throw new Error(`Cannot classify Dependabot changes in ${path}`);
    }
    entries.set(index, {
      dependency: (entry[1] ?? entry[2] ?? entry[3]).trim(),
      value: entry[4].trim(),
    });
  }

  if (!catalogFound) {
    throw new Error(`Cannot classify Dependabot changes in ${path}`);
  }

  return { entries, lines };
}

function usesCatalogDependency(manifest, field, dependency) {
  return manifest[field]?.[dependency] === "catalog:";
}

export function classifyCatalogDependencyUpdate({
  after,
  before,
  workspaceManifests,
}) {
  if (
    typeof after !== "string" ||
    typeof before !== "string" ||
    !Array.isArray(workspaceManifests)
  ) {
    throw new TypeError(
      "Catalog contents and workspace manifests are required",
    );
  }

  const path = "pnpm-workspace.yaml";
  const afterCatalog = readCatalogEntries(after, path);
  const beforeCatalog = readCatalogEntries(before, path);
  if (afterCatalog.lines.length !== beforeCatalog.lines.length) {
    throw new Error(`Cannot classify Dependabot changes in ${path}`);
  }

  const changedDependencies = new Set();
  for (const [index, beforeLine] of beforeCatalog.lines.entries()) {
    const afterLine = afterCatalog.lines[index];
    if (beforeLine === afterLine) {
      continue;
    }

    const beforeEntry = beforeCatalog.entries.get(index);
    const afterEntry = afterCatalog.entries.get(index);
    if (
      !beforeEntry ||
      !afterEntry ||
      beforeEntry.dependency !== afterEntry.dependency ||
      beforeEntry.value === afterEntry.value
    ) {
      throw new Error(`Cannot classify Dependabot changes in ${path}`);
    }
    changedDependencies.add(afterEntry.dependency);
  }

  if (changedDependencies.size === 0) {
    throw new Error(`Cannot classify Dependabot changes in ${path}`);
  }

  const runtimePackages = new Set();
  let hasDevelopmentChanges = false;
  const classifiedDependencies = new Set();

  for (const manifest of workspaceManifests) {
    if (!manifest?.name) {
      throw new Error(`Cannot classify Dependabot changes in ${path}`);
    }

    for (const dependency of changedDependencies) {
      const hasRuntimeChanges = runtimeDependencyFields.some((field) =>
        usesCatalogDependency(manifest, field, dependency),
      );
      const hasDevChanges = developmentDependencyFields.some((field) =>
        usesCatalogDependency(manifest, field, dependency),
      );

      if (hasRuntimeChanges) {
        if (!manifest.name.startsWith("@lootlog/")) {
          throw new Error(`Cannot classify Dependabot changes in ${path}`);
        }
        runtimePackages.add(manifest.name);
        classifiedDependencies.add(dependency);
      }
      if (hasDevChanges) {
        hasDevelopmentChanges = true;
        classifiedDependencies.add(dependency);
      }
    }
  }

  if (classifiedDependencies.size !== changedDependencies.size) {
    throw new Error(`Cannot classify Dependabot changes in ${path}`);
  }

  return {
    hasDevelopmentChanges,
    runtimePackages: [...runtimePackages].sort(),
  };
}

function encodeRepositoryPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function requestGitHub(path, { body, method = "GET", token }) {
  const response = await fetch(`https://api.github.com${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "lootlog-dependabot-changeset",
    },
    method,
  });

  if (!response.ok) {
    const responseBody = await response.text();
    const error = new Error(
      `GitHub API ${method} ${path} failed with ${response.status}: ${responseBody}`,
    );
    error.status = response.status;
    throw error;
  }

  return response.json();
}

async function readRepositoryJson({ path, ref, repository, token }) {
  const content = await readRepositoryContent({
    path,
    ref,
    repository,
    token,
  });
  return JSON.parse(content);
}

async function readRepositoryContent({ path, ref, repository, token }) {
  const encodedPath = encodeRepositoryPath(path);
  const result = await requestGitHub(
    `/repos/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
    { token },
  );
  return Buffer.from(result.content, "base64").toString("utf8");
}

export function classifyChangedDependencyPaths({
  filenames,
  pullRequestNumber,
}) {
  const ownChangeset = `.changeset/dependabot-pr-${pullRequestNumber}.md`;
  const manifestPaths = [];
  const toolingPaths = [];
  let catalogPath;

  for (const filename of filenames) {
    if (filename === "pnpm-lock.yaml" || filename === ownChangeset) {
      continue;
    }
    if (filename === "pnpm-workspace.yaml") {
      catalogPath = filename;
      continue;
    }
    if (
      filename === "package.json" ||
      filename.match(workspaceManifestPattern)
    ) {
      manifestPaths.push(filename);
      continue;
    }
    if (filename.match(githubActionsWorkflowPattern)) {
      toolingPaths.push(filename);
      continue;
    }

    throw new Error(`Cannot classify Dependabot file ${filename}`);
  }

  return {
    catalogPath,
    manifestPaths: [...new Set(manifestPaths)].sort(),
    toolingPaths: [...new Set(toolingPaths)].sort(),
  };
}

function parseGitHubActionUse(line) {
  return line.match(githubActionUsePattern)?.groups;
}

export function validateGitHubActionsDependencyUpdate({ after, before, path }) {
  const afterLines = after.split(/\r?\n/);
  const beforeLines = before.split(/\r?\n/);
  if (afterLines.length !== beforeLines.length) {
    throw new Error(`Cannot classify Dependabot changes in ${path}`);
  }

  let changedActions = 0;
  for (const [index, beforeLine] of beforeLines.entries()) {
    const afterLine = afterLines[index];
    if (beforeLine === afterLine) {
      continue;
    }

    const beforeUse = parseGitHubActionUse(beforeLine);
    const afterUse = parseGitHubActionUse(afterLine);
    if (
      !beforeUse ||
      !afterUse ||
      beforeUse.prefix !== afterUse.prefix ||
      beforeUse.action !== afterUse.action ||
      beforeUse.suffix !== afterUse.suffix ||
      beforeUse.ref === afterUse.ref
    ) {
      throw new Error(`Cannot classify Dependabot changes in ${path}`);
    }
    changedActions += 1;
  }

  if (changedActions === 0) {
    throw new Error(`Cannot classify Dependabot changes in ${path}`);
  }
}

async function listChangedFiles({ pullRequestNumber, repository, token }) {
  const filenames = [];

  for (let page = 1; ; page += 1) {
    const files = await requestGitHub(
      `/repos/${repository}/pulls/${pullRequestNumber}/files?per_page=100&page=${page}`,
      { token },
    );
    filenames.push(...files.map(({ filename }) => filename));

    if (files.length < 100) {
      return [...new Set(filenames)].sort();
    }
  }
}

async function listRepositoryManifestPaths({ ref, repository, token }) {
  const tree = await requestGitHub(
    `/repos/${repository}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { token },
  );
  if (tree.truncated) {
    throw new Error(`Repository tree for ${ref} is truncated`);
  }

  return [
    "package.json",
    ...tree.tree
      .filter(
        ({ path, type }) =>
          type === "blob" && path.match(workspaceManifestPattern),
      )
      .map(({ path }) => path)
      .sort(),
  ];
}

function writeOutput(outputPath, values) {
  const output = Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  appendFileSync(outputPath, `${output}\n`);
}

export async function automateDependabotChangeset({
  baseSha,
  headRef,
  headSha,
  outputPath,
  pullRequestNumber,
  repository,
  token,
}) {
  const filenames = await listChangedFiles({
    pullRequestNumber,
    repository,
    token,
  });
  const { catalogPath, manifestPaths, toolingPaths } =
    classifyChangedDependencyPaths({
      filenames,
      pullRequestNumber,
    });
  const changedManifests = await Promise.all(
    manifestPaths.map(async (path) => ({
      after: await readRepositoryJson({
        path,
        ref: headSha,
        repository,
        token,
      }),
      before: await readRepositoryJson({
        path,
        ref: baseSha,
        repository,
        token,
      }),
      path,
    })),
  );
  const changedToolingFiles = await Promise.all(
    toolingPaths.map(async (path) => ({
      after: await readRepositoryContent({
        path,
        ref: headSha,
        repository,
        token,
      }),
      before: await readRepositoryContent({
        path,
        ref: baseSha,
        repository,
        token,
      }),
      path,
    })),
  );
  changedToolingFiles.forEach(validateGitHubActionsDependencyUpdate);
  let catalogChanges;
  if (catalogPath) {
    const [after, before, repositoryManifestPaths] = await Promise.all([
      readRepositoryContent({
        path: catalogPath,
        ref: headSha,
        repository,
        token,
      }),
      readRepositoryContent({
        path: catalogPath,
        ref: baseSha,
        repository,
        token,
      }),
      listRepositoryManifestPaths({
        ref: headSha,
        repository,
        token,
      }),
    ]);
    const workspaceManifests = await Promise.all(
      repositoryManifestPaths.map((path) =>
        readRepositoryJson({
          path,
          ref: headSha,
          repository,
          token,
        }),
      ),
    );
    catalogChanges = classifyCatalogDependencyUpdate({
      after,
      before,
      workspaceManifests,
    });
  }
  const changeset = createDependabotChangeset({
    catalogChanges,
    changedManifests,
    hasToolingChanges: changedToolingFiles.length > 0,
    pullRequestNumber,
  });

  if (!changeset) {
    writeOutput(outputPath, { changed: false });
    return null;
  }

  const encodedFilename = encodeRepositoryPath(changeset.filename);
  let existingFile;
  try {
    existingFile = await requestGitHub(
      `/repos/${repository}/contents/${encodedFilename}?ref=${encodeURIComponent(headRef)}`,
      { token },
    );
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }

  const existingContent = existingFile
    ? Buffer.from(existingFile.content, "base64").toString("utf8")
    : undefined;
  if (existingContent === changeset.content) {
    writeOutput(outputPath, {
      changed: false,
      filename: changeset.filename,
    });
    return null;
  }

  const result = await requestGitHub(
    `/repos/${repository}/contents/${encodedFilename}`,
    {
      body: {
        branch: headRef,
        content: Buffer.from(changeset.content).toString("base64"),
        message: `chore: add changeset for dependabot PR #${pullRequestNumber}`,
        ...(existingFile ? { sha: existingFile.sha } : {}),
      },
      method: "PUT",
      token,
    },
  );
  const commitSha = result.commit.sha;
  writeOutput(outputPath, {
    changed: true,
    commit_sha: commitSha,
    filename: changeset.filename,
  });
  return commitSha;
}

const isCommandLineInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCommandLineInvocation) {
  const requiredEnvironment = [
    "BASE_SHA",
    "GH_TOKEN",
    "GITHUB_OUTPUT",
    "GITHUB_REPOSITORY",
    "HEAD_REF",
    "HEAD_SHA",
    "PULL_REQUEST_NUMBER",
  ];
  const missingEnvironment = requiredEnvironment.filter(
    (name) => !process.env[name],
  );

  if (missingEnvironment.length > 0) {
    throw new Error(
      `Missing required environment: ${missingEnvironment.join(", ")}`,
    );
  }

  await automateDependabotChangeset({
    baseSha: process.env.BASE_SHA,
    headRef: process.env.HEAD_REF,
    headSha: process.env.HEAD_SHA,
    outputPath: process.env.GITHUB_OUTPUT,
    pullRequestNumber: Number(process.env.PULL_REQUEST_NUMBER),
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GH_TOKEN,
  });
}
