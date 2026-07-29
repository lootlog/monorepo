import assert from "node:assert/strict";
import test from "node:test";

import { getMergeGroupPullRequestNumber } from "./merge-group-pull-request.mjs";

test("extracts the pull request number from a merge queue head ref", () => {
  assert.equal(
    getMergeGroupPullRequestNumber(
      "gh-readonly-queue/main/pr-1225-1dc7910bb7f3d34a8a280a4fce57623a54a0d8fd",
    ),
    1225,
  );
});

test("rejects a head ref that does not identify exactly one pull request", () => {
  assert.throws(
    () => getMergeGroupPullRequestNumber("gh-readonly-queue/main"),
    /exactly one pull request/,
  );
});
