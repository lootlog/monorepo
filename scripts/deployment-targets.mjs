import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const catalogPath = fileURLToPath(
  new URL("../.github/deployment-targets.json", import.meta.url),
);

const clientProducers = new Set([
  "@lootlog/activity",
  "@lootlog/api",
  "@lootlog/auth",
  "@lootlog/battlelog",
  "@lootlog/client",
  "@lootlog/search",
]);

const integrationPackages = new Set([
  "@lootlog/activity",
  "@lootlog/api",
  "@lootlog/auth",
  "@lootlog/gateway",
  "@lootlog/messaging",
]);

const globalDockerInputs = new Set([
  ".github/deployment-targets.json",
  ".dockerignore",
  "bun.lock",
  "package.json",
  "turbo.json",
]);

const isWorkspaceManifest = (file) =>
  /^(?:apps|packages)\/[^/]+\/package\.json$/u.test(file);

function validateDockerTarget(target) {
  if (
    !target.dockerfile ||
    !target.image ||
    !target.imageTitle ||
    !target.imageDescription
  ) {
    throw new Error(
      `Docker target ${target.id} needs dockerfile, image and image metadata`,
    );
  }
  if (
    target.installFonts !== undefined &&
    typeof target.installFonts !== "boolean"
  ) {
    throw new Error(`Docker target ${target.id} has invalid installFonts`);
  }
}

function validateCloudflareTarget(target) {
  if (!target.artifactPath || !target.production?.project) {
    throw new Error(
      `Cloudflare target ${target.id} needs artifactPath and production.project`,
    );
  }
  if (target.kind === "worker" && !target.configPath) {
    throw new Error(`Worker target ${target.id} needs configPath`);
  }
  const requiredEnvironmentVariables =
    target.production?.requiredEnvironmentVariables ?? [];
  if (
    !Array.isArray(requiredEnvironmentVariables) ||
    requiredEnvironmentVariables.some(
      (name) => typeof name !== "string" || !/^[A-Z][A-Z0-9_]*$/u.test(name),
    )
  ) {
    throw new Error(
      `Cloudflare target ${target.id} has invalid required environment variables`,
    );
  }
}

export async function loadDeploymentTargets() {
  const targets = JSON.parse(await readFile(catalogPath, "utf8"));
  const ids = new Set();
  const packages = new Set();

  for (const target of targets) {
    if (!target.id || !target.package || !target.directory || !target.kind) {
      throw new Error(
        "Every deployment target needs id, package, directory and kind",
      );
    }
    if (ids.has(target.id))
      throw new Error(`Duplicate target id: ${target.id}`);
    if (packages.has(target.package)) {
      throw new Error(`Duplicate target package: ${target.package}`);
    }
    if (!new Set(["docker", "pages", "worker"]).has(target.kind)) {
      throw new Error(`Unsupported target kind: ${target.kind}`);
    }
    if (target.kind === "docker") validateDockerTarget(target);
    else validateCloudflareTarget(target);
    ids.add(target.id);
    packages.add(target.package);
  }

  return targets;
}

function isDockerPackagingChange(target, changedFiles, affectedPackages) {
  const targetInputChanged = changedFiles.some(
    (file) =>
      globalDockerInputs.has(file) ||
      file.startsWith("patches/") ||
      file === target.dockerfile ||
      file === `${target.directory}/package.json` ||
      file.startsWith(`${target.directory}/scripts/`) ||
      file.startsWith(`${target.directory}/tools/`),
  );
  if (targetInputChanged) return true;

  const workspaceManifestChanged = changedFiles.some(isWorkspaceManifest);
  return workspaceManifestChanged && affectedPackages.has(target.package);
}

function validateProductionState(state, label, targetsById) {
  if (
    state?.schemaVersion !== 1 ||
    !state.targets ||
    typeof state.targets !== "object" ||
    Array.isArray(state.targets)
  ) {
    throw new Error(`${label} production state has an unsupported schema`);
  }

  for (const [id, deployment] of Object.entries(state.targets)) {
    const target = targetsById.get(id);
    if (!target)
      throw new Error(`${label} state contains unknown target: ${id}`);
    if (deployment?.kind !== target.kind) {
      throw new Error(`${label} state has an invalid kind for target: ${id}`);
    }
    const validDocker =
      deployment.kind === "docker" &&
      typeof deployment.image === "string" &&
      typeof deployment.reference === "string";
    const validCloudflare =
      deployment.kind !== "docker" &&
      typeof deployment.project === "string" &&
      typeof deployment.deploymentId === "string" &&
      (deployment.kind !== "worker" ||
        typeof deployment.configPath === "string");
    if (!validDocker && !validCloudflare) {
      throw new Error(`${label} state is incomplete for target: ${id}`);
    }
  }
}

function createRollbackPlan(input, targets) {
  const targetsById = new Map(targets.map((target) => [target.id, target]));
  validateProductionState(input.currentState, "Current", targetsById);
  validateProductionState(input.previousState, "Previous", targetsById);

  const changedTargets = new Set([
    ...Object.keys(input.currentState.targets),
    ...Object.keys(input.previousState.targets),
  ]);
  const rollbackTargets = targets
    .filter(({ id }) => {
      if (!changedTargets.has(id)) return false;
      return !isDeepStrictEqual(
        input.currentState.targets[id],
        input.previousState.targets[id],
      );
    })
    .map(({ id }) => ({
      id,
      current: input.currentState.targets[id] ?? null,
      previous: input.previousState.targets[id] ?? null,
    }));

  if (rollbackTargets.length === 0) {
    throw new Error("The last production state change has nothing to restore");
  }
  const unrestorable = rollbackTargets.find(
    ({ previous }) => previous === null,
  );
  if (unrestorable) {
    throw new Error(
      `Previous production state does not contain target: ${unrestorable.id}`,
    );
  }

  return { targets: rollbackTargets };
}

export async function createDeploymentPlan(input) {
  const targets = await loadDeploymentTargets();

  if (input.mode === "rollback") return createRollbackPlan(input, targets);

  if (input.mode === "release") {
    const target = targets.find(({ id }) => id === input.target);
    if (input.target !== "all" && !target) {
      throw new Error(`Unknown deployment target: ${input.target}`);
    }
    const selectedTargets = input.target === "all" ? targets : [target];
    if (
      selectedTargets.some(({ id }) => id === "auth") &&
      input.authMigrationConfirmed !== true
    ) {
      throw new Error("Auth migration confirmation is required");
    }
    return { targets: selectedTargets };
  }

  const affectedPackages = new Set(input.affectedPackages ?? []);
  if (input.mode === "dev") {
    const changedFiles = input.changedFiles ?? [];
    return {
      targets: targets.filter(
        (target) =>
          target.development !== false &&
          (affectedPackages.has(target.package) ||
            (target.kind === "docker" &&
              isDockerPackagingChange(target, changedFiles, affectedPackages))),
      ),
    };
  }

  if (input.mode === "ci") {
    const packages = [...affectedPackages]
      .filter(
        (name) => typeof name === "string" && name.startsWith("@lootlog/"),
      )
      .sort();
    const changedFiles = input.changedFiles ?? [];
    return {
      packages,
      integrationPackages: packages.filter((name) =>
        integrationPackages.has(name),
      ),
      runClientCheck: packages.some((name) => clientProducers.has(name)),
      dockerTargets: targets.filter(
        (target) =>
          target.kind === "docker" &&
          isDockerPackagingChange(target, changedFiles, affectedPackages),
      ),
    };
  }

  throw new Error(`Unknown planning mode: ${input.mode}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const serializedInput = process.argv[2] ?? (await Bun.stdin.text());
  const input = JSON.parse(serializedInput || "null");
  process.stdout.write(JSON.stringify(await createDeploymentPlan(input)));
}
