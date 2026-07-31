import assert from "node:assert/strict";
import test from "node:test";

import { dispatchAutomatedPullRequestCi } from "./dispatch-automated-pr-ci.mjs";

const baseInput = {
  apiUrl: "https://api.github.test",
  baseSha: "base-sha",
  headRef: "changeset-release/main",
  headSha: "head-sha",
  pullRequestNumber: "1225",
  repository: "lootlog/monorepo",
  token: "test-token",
};

test("does not dispatch CI when the automatic pull request run appears", async () => {
  const requests = [];
  const sleepCalls = [];
  const responses = [
    Response.json({ total_count: 0, workflow_runs: [] }),
    Response.json({
      total_count: 1,
      workflow_runs: [{ id: 123, event: "pull_request", head_sha: "head-sha" }],
    }),
  ];

  await dispatchAutomatedPullRequestCi({
    ...baseInput,
    fetchImplementation: (url, options) => {
      requests.push({ options, url: url.toString() });
      return responses.shift();
    },
    pollIntervalMs: 1,
    sleep: (milliseconds) => {
      sleepCalls.push(milliseconds);
      return Promise.resolve();
    },
  });

  assert.equal(requests.length, 2);
  assert.equal(
    requests[0].url,
    "https://api.github.test/repos/lootlog/monorepo/actions/workflows/ci.yml/runs?event=pull_request&head_sha=head-sha&per_page=1",
  );
  assert.equal(requests[0].options.method, "GET");
  assert.deepEqual(sleepCalls, [1]);
  assert.deepEqual(
    requests.map(({ options }) => options.method),
    ["GET", "GET"],
  );
});

test("dispatches CI when the automatic pull request run does not appear", async () => {
  const requests = [];
  const responses = [
    Response.json({ total_count: 0, workflow_runs: [] }),
    Response.json({ total_count: 0, workflow_runs: [] }),
    new Response(null, { status: 204 }),
  ];

  await dispatchAutomatedPullRequestCi({
    ...baseInput,
    fetchImplementation: (url, options) => {
      requests.push({ options, url: url.toString() });
      return responses.shift();
    },
    maxPollAttempts: 2,
    pollIntervalMs: 1,
    sleep: () => Promise.resolve(),
  });

  assert.equal(requests.length, 3);
  assert.equal(
    requests[2].url,
    "https://api.github.test/repos/lootlog/monorepo/actions/workflows/ci.yml/dispatches",
  );
  assert.equal(requests[2].options.method, "POST");
  assert.deepEqual(JSON.parse(requests[2].options.body), {
    inputs: {
      base_sha: "base-sha",
      head_sha: "head-sha",
      pull_request_number: "1225",
    },
    ref: "changeset-release/main",
  });
});

test("reports a failed workflow dispatch", async () => {
  const responses = [
    Response.json({ total_count: 0, workflow_runs: [] }),
    Response.json({ message: "dispatch failed" }, { status: 422 }),
  ];

  await assert.rejects(
    dispatchAutomatedPullRequestCi({
      ...baseInput,
      fetchImplementation: () => responses.shift(),
      maxPollAttempts: 1,
      sleep: () => Promise.resolve(),
    }),
    /dispatch failed \(422\)/,
  );
});
