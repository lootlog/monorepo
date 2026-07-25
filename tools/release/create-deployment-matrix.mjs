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

const semanticVersionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function createDeploymentMatrix(publishedPackages) {
  if (!Array.isArray(publishedPackages)) {
    throw new TypeError("Published packages must be an array");
  }

  const seenPackages = new Set();

  return publishedPackages.flatMap((publishedPackage) => {
    const { name, version } = publishedPackage;
    const service = name?.startsWith("@lootlog/") ? name.slice(9) : undefined;

    if (!service || !deployableServices.has(service)) {
      return [];
    }

    if (!semanticVersionPattern.test(version)) {
      throw new Error(`Invalid semantic version for ${name}: ${version}`);
    }

    if (seenPackages.has(name)) {
      throw new Error(`Duplicate published package: ${name}`);
    }
    seenPackages.add(name);

    return [
      {
        image: `kamilwronka7/lootlog-${service}`,
        packageName: name,
        service,
        version,
      },
    ];
  });
}

const isCommandLineInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCommandLineInvocation) {
  const publishedPackages = JSON.parse(process.argv[2] ?? "[]");
  process.stdout.write(
    JSON.stringify(createDeploymentMatrix(publishedPackages)),
  );
}
