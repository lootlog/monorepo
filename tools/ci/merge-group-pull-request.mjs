import { pathToFileURL } from "node:url";

export function getMergeGroupPullRequestNumber(headRef) {
  if (typeof headRef !== "string") {
    throw new TypeError("Merge group head ref must be a string");
  }

  const matches = [...headRef.matchAll(/(?:^|\/)pr-(\d+)(?=-|$)/g)];
  if (matches.length !== 1) {
    throw new Error(
      `Merge group head ref must identify exactly one pull request: ${headRef}`,
    );
  }

  const pullRequestNumber = Number(matches[0][1]);
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1) {
    throw new Error(
      `Invalid pull request number in merge group ref: ${headRef}`,
    );
  }

  return pullRequestNumber;
}

const isCommandLineInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCommandLineInvocation) {
  process.stdout.write(
    String(getMergeGroupPullRequestNumber(process.argv[2] ?? "")),
  );
}
