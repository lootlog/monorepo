import { pathToFileURL } from "node:url";

const deployableServices = new Set([
  "activity",
  "api",
  "auth",
  "battlelog-service",
  "developer",
  "discord-bot",
  "gateway",
  "search",
]);

const apiClientProducers = new Set([
  "@lootlog/activity",
  "@lootlog/api",
  "@lootlog/api-client",
  "@lootlog/auth",
  "@lootlog/battlelog-service",
  "@lootlog/search",
]);

export function createCiPlan({
  affectedPackages,
  associatedPullRequestHeads = [],
}) {
  if (
    !Array.isArray(affectedPackages) ||
    !Array.isArray(associatedPullRequestHeads)
  ) {
    throw new TypeError(
      "Affected packages and pull request heads must be arrays",
    );
  }

  const packages = [
    ...new Set(
      affectedPackages.filter(
        (packageName) =>
          typeof packageName === "string" &&
          packageName.startsWith("@lootlog/"),
      ),
    ),
  ].sort();
  const versionPullRequest = associatedPullRequestHeads.some((head) =>
    head.startsWith("changeset-release/"),
  );
  const dockerServices = versionPullRequest
    ? []
    : packages.flatMap((packageName) => {
        const service = packageName.slice("@lootlog/".length);
        return deployableServices.has(service) ? [service] : [];
      });

  return {
    dockerServices,
    packages,
    runApiClientCheck: packages.some((packageName) =>
      apiClientProducers.has(packageName),
    ),
    versionPullRequest,
  };
}

const isCommandLineInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCommandLineInvocation) {
  const affectedPackages = JSON.parse(process.argv[2] ?? "[]");
  const associatedPullRequestHeads = JSON.parse(process.argv[3] ?? "[]");
  process.stdout.write(
    JSON.stringify(
      createCiPlan({ affectedPackages, associatedPullRequestHeads }),
    ),
  );
}
