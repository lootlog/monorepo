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

test("waits for the automatic pull request run before dispatching CI", async () => {
  const requests = [];
  const sleepCalls = [];
  const responses = [
    Response.json({ total_count: 0, workflow_runs: [] }),
    Response.json({
      total_count: 1,
      workflow_runs: [{ id: 123, event: "pull_request", head_sha: "head-sha" }],
    }),
    new Response(null, { status: 204 }),
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

  assert.equal(requests.length, 3);
  assert.equal(
    requests[0].url,
    "https://api.github.test/repos/lootlog/monorepo/actions/workflows/ci.yml/runs?event=pull_request&head_sha=head-sha&per_page=1",
  );
  assert.equal(requests[0].options.method, "GET");
  assert.deepEqual(sleepCalls, [1]);
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

test("fails without dispatching when the automatic run does not appear", async () => {
  let requestCount = 0;

  await assert.rejects(
    dispatchAutomatedPullRequestCi({
      ...baseInput,
      fetchImplementation: () => {
        requestCount += 1;
        return Response.json({ total_count: 0, workflow_runs: [] });
      },
      maxPollAttempts: 2,
      pollIntervalMs: 1,
      sleep: () => Promise.resolve(),
    }),
    /automatic pull_request run/,
  );

  assert.equal(requestCount, 2);
});

test("reports a failed workflow dispatch", async () => {
  const responses = [
    Response.json({
      total_count: 1,
      workflow_runs: [{ id: 123, event: "pull_request", head_sha: "head-sha" }],
    }),
    Response.json({ message: "dispatch failed" }, { status: 422 }),
  ];

  await assert.rejects(
    dispatchAutomatedPullRequestCi({
      ...baseInput,
      fetchImplementation: () => responses.shift(),
      sleep: () => Promise.resolve(),
    }),
    /dispatch failed \(422\)/,
  );
});
