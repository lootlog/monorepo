import { pathToFileURL } from "node:url";

const DEFAULT_MAX_POLL_ATTEMPTS = 30;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const GITHUB_API_VERSION = "2022-11-28";
const WORKFLOW_FILE = "ci.yml";

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const requireValue = (value, name) => {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const readErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
};

export const dispatchAutomatedPullRequestCi = async ({
  apiUrl = "https://api.github.com",
  baseSha,
  fetchImplementation = globalThis.fetch,
  headRef,
  headSha,
  maxPollAttempts = DEFAULT_MAX_POLL_ATTEMPTS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  pullRequestNumber,
  repository,
  sleep = wait,
  token,
}) => {
  const normalizedApiUrl = apiUrl.replace(/\/$/, "");
  const workflowPath = `${normalizedApiUrl}/repos/${repository}/actions/workflows/${WORKFLOW_FILE}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
  const workflowRunsUrl = new URL(`${workflowPath}/runs`);
  workflowRunsUrl.searchParams.set("event", "pull_request");
  workflowRunsUrl.searchParams.set("head_sha", headSha);
  workflowRunsUrl.searchParams.set("per_page", "1");

  const waitForAutomaticRun = async (attempt) => {
    const response = await fetchImplementation(workflowRunsUrl, {
      headers,
      method: "GET",
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new Error(
        `Failed to inspect automatic CI runs (${response.status}): ${message}`,
      );
    }

    const payload = await response.json();
    const automaticRunFound = payload.workflow_runs?.some(
      (workflowRun) =>
        workflowRun.event === "pull_request" &&
        workflowRun.head_sha === headSha,
    );

    if (automaticRunFound) {
      return true;
    }

    if (attempt >= maxPollAttempts) {
      return false;
    }

    await sleep(pollIntervalMs);
    return waitForAutomaticRun(attempt + 1);
  };

  const automaticRunFound = await waitForAutomaticRun(1);

  if (!automaticRunFound) {
    throw new Error(
      `The automatic pull_request run for ${headSha} did not appear before the CI dispatch timeout`,
    );
  }

  const dispatchResponse = await fetchImplementation(
    `${workflowPath}/dispatches`,
    {
      body: JSON.stringify({
        inputs: {
          base_sha: baseSha,
          head_sha: headSha,
          pull_request_number: pullRequestNumber,
        },
        ref: headRef,
      }),
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!dispatchResponse.ok) {
    const message = await readErrorMessage(dispatchResponse);
    throw new Error(
      `CI workflow dispatch failed (${dispatchResponse.status}): ${message}`,
    );
  }
};

const isCliInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCliInvocation) {
  await dispatchAutomatedPullRequestCi({
    apiUrl: process.env.GITHUB_API_URL,
    baseSha: requireValue(process.env.BASE_SHA, "BASE_SHA"),
    headRef: requireValue(process.env.HEAD_REF, "HEAD_REF"),
    headSha: requireValue(process.env.HEAD_SHA, "HEAD_SHA"),
    pullRequestNumber: requireValue(
      process.env.PULL_REQUEST_NUMBER,
      "PULL_REQUEST_NUMBER",
    ),
    repository: requireValue(
      process.env.GITHUB_REPOSITORY,
      "GITHUB_REPOSITORY",
    ),
    token: requireValue(process.env.GH_TOKEN, "GH_TOKEN"),
  });
}
