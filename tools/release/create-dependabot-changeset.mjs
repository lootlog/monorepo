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
  changedManifests,
  pullRequestNumber,
}) {
  if (!Array.isArray(changedManifests)) {
    throw new TypeError("Changed manifests must be an array");
  }
  if (!Number.isInteger(pullRequestNumber) || pullRequestNumber <= 0) {
    throw new TypeError("Pull request number must be a positive integer");
  }
  if (changedManifests.length === 0) {
    return null;
  }

  const runtimePackages = new Set();
  let hasDevelopmentChanges = false;

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

  if (hasDevelopmentChanges) {
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
  const encodedPath = encodeRepositoryPath(path);
  const result = await requestGitHub(
    `/repos/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
    { token },
  );
  return JSON.parse(Buffer.from(result.content, "base64").toString("utf8"));
}

export function selectChangedManifestPaths({ filenames, pullRequestNumber }) {
  const ownChangeset = `.changeset/dependabot-pr-${pullRequestNumber}.md`;
  const manifestPaths = [];

  for (const filename of filenames) {
    if (filename === "pnpm-lock.yaml" || filename === ownChangeset) {
      continue;
    }
    if (
      filename === "package.json" ||
      filename.match(workspaceManifestPattern)
    ) {
      manifestPaths.push(filename);
      continue;
    }

    throw new Error(`Cannot classify Dependabot file ${filename}`);
  }

  return [...new Set(manifestPaths)].sort();
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
  const manifestPaths = selectChangedManifestPaths({
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
  const changeset = createDependabotChangeset({
    changedManifests,
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
