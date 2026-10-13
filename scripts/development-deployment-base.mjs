import { isString } from "./deployment-input.ts";

const {
  GH_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_API_URL = "https://api.github.com",
} = process.env;

if (!GH_TOKEN || !GITHUB_REPOSITORY) {
  throw new Error(
    "Development deployment needs GH_TOKEN and GITHUB_REPOSITORY",
  );
}

const url = new URL(
  `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/actions/workflows/dev-deploy.yml/runs`,
);

url.search = new URLSearchParams({
  branch: "main",
  event: "push",
  status: "completed",
  per_page: "1",
}).toString();

const response = await fetch(url, {
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${GH_TOKEN}`,
  },
  signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
  throw new Error(
    `Cannot read development deployment history: HTTP ${response.status}`,
  );
}

const history = await response.json();

if (!Array.isArray(history?.workflow_runs)) {
  throw new Error("Development deployment history has an invalid response");
}

const previousRun = history.workflow_runs[0];

if (previousRun) {
  const baseSha = previousRun.head_sha;

  if (!isString(baseSha) || !/^[0-9a-f]{40}$/u.test(baseSha)) {
    throw new Error("Previous development deployment has an invalid SHA");
  }

  if (!isString(previousRun.conclusion)) {
    throw new Error(
      "Previous development deployment has an invalid conclusion",
    );
  }

  process.stdout.write(
    JSON.stringify({
      baseSha,
      deployAll: previousRun.conclusion !== "success",
    }),
  );
} else {
  process.stdout.write(JSON.stringify({ baseSha: null, deployAll: true }));
}
