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

const cloudflareTargets = new Map([
  [
    "@lootlog/landing",
    {
      artifactPath: "apps/landing/dist/client",
      kind: "pages",
      project: "lootlog-landing",
    },
  ],
  [
    "@lootlog/web",
    {
      artifactPath: "apps/web/dist",
      kind: "pages",
      project: "lootlog-web-monorepo",
    },
  ],
  [
    "@lootlog/game-client",
    {
      artifactPath: "apps/game-client/dist/@lootlog",
      kind: "pages",
      project: "lootlog-game-client-monorepo",
    },
  ],
  [
    "@lootlog/docs",
    {
      artifactPath: "apps/docs/dist/client",
      configPath: "apps/docs/wrangler.jsonc",
      kind: "worker",
      project: "lootlog-docs",
    },
  ],
  [
    "@lootlog/wiki",
    {
      artifactPath: "apps/wiki/dist",
      configPath: "apps/wiki/wrangler.jsonc",
      kind: "worker",
      project: "lootlog-wiki",
    },
  ],
]);

const semanticVersionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function createReleasePlan(publishedPackages) {
  if (!Array.isArray(publishedPackages)) {
    throw new TypeError("Published packages must be an array");
  }

  const seenPackages = new Set();
  const releasePlan = {
    cloudflare: [],
    docker: [],
  };

  for (const publishedPackage of publishedPackages) {
    const { name, version } = publishedPackage;
    const service = name?.startsWith("@lootlog/") ? name.slice(9) : undefined;
    const cloudflareTarget = cloudflareTargets.get(name);

    if ((!service || !deployableServices.has(service)) && !cloudflareTarget) {
      continue;
    }

    if (!semanticVersionPattern.test(version)) {
      throw new Error(`Invalid semantic version for ${name}: ${version}`);
    }

    if (seenPackages.has(name)) {
      throw new Error(`Duplicate published package: ${name}`);
    }
    seenPackages.add(name);

    if (service && deployableServices.has(service)) {
      releasePlan.docker.push({
        image: `kamilwronka7/lootlog-${service}`,
        packageName: name,
        service,
        version,
      });
    }

    if (cloudflareTarget) {
      releasePlan.cloudflare.push({
        ...cloudflareTarget,
        packageName: name,
        version,
      });
    }
  }

  return releasePlan;
}

const isCommandLineInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCommandLineInvocation) {
  const publishedPackages = JSON.parse(process.argv[2] ?? "[]");
  process.stdout.write(JSON.stringify(createReleasePlan(publishedPackages)));
}
