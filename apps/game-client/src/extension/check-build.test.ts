import { afterEach, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildProfile } from "../../extension/build-profile";
import { checkBuild } from "../../extension/check-build";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

async function artifact(mode: string) {
  const directory = await mkdtemp(path.join(tmpdir(), "lootlog-build-"));
  directories.push(directory);
  const profile = buildProfile(mode);
  await mkdir(path.join(directory, "content-scripts"));
  const source = JSON.stringify(profile);
  await Promise.all([
    writeFile(path.join(directory, "background.js"), source),
    writeFile(path.join(directory, "content-scripts/game.js"), source),
    writeFile(
      path.join(directory, "manifest.json"),
      JSON.stringify({
        host_permissions: [
          ...new Set(
            Object.entries(profile)
              .filter(
                ([key]) =>
                  key.endsWith("_URL") && key !== "VITE_LOOTLOG_APP_URL",
              )
              .map(([, value]) => `${new URL(value).origin}/*`),
          ),
        ],
        background: { service_worker: "background.js" },
        content_scripts: [{ js: ["content-scripts/game.js"] }],
      }),
    ),
  ]);
  return { directory, source };
}

it.each(["production-local", "production"])(
  "validates %s and rejects mixed service endpoints",
  async (mode) => {
    const { directory, source } = await artifact(mode);
    await expect(checkBuild(directory, mode)).resolves.toBeUndefined();
    const wrong =
      mode === "production"
        ? "http://localhost/api/auth"
        : "https://auth.lootlog.pl";
    await writeFile(path.join(directory, "background.js"), source + wrong);
    await expect(checkBuild(directory, mode)).rejects.toThrow(
      "wrong environment",
    );
  },
);

it("rejects a production manifest on a local build", async () => {
  const { directory } = await artifact("production");
  await expect(checkBuild(directory, "production-local")).rejects.toThrow(
    "host permissions",
  );
});

it("rejects Unicode noncharacters that Chrome cannot load", async () => {
  const { directory, source } = await artifact("production-local");
  await writeFile(
    path.join(directory, "content-scripts/game.js"),
    source + "\uffff",
  );
  await expect(checkBuild(directory, "production-local")).rejects.toThrow(
    "U+FFFF",
  );
});

it("rejects Firefox local builds that would upgrade ws:// to wss://", async () => {
  const { directory } = await artifact("production-local");
  const file = path.join(directory, "manifest.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  manifest.browser_specific_settings = {
    gecko: { id: "game-client@lootlog.pl" },
  };
  await writeFile(file, JSON.stringify(manifest));
  await expect(checkBuild(directory, "production-local")).rejects.toThrow(
    "Local Firefox CSP",
  );
  manifest.content_security_policy = {
    extension_pages: "script-src 'self'; object-src 'self'",
  };
  await writeFile(file, JSON.stringify(manifest));
  await expect(
    checkBuild(directory, "production-local"),
  ).resolves.toBeUndefined();
});

it("permits WXT development CSP while retaining packaged build checks", async () => {
  const { directory } = await artifact("production-local");
  const file = path.join(directory, "manifest.json");
  const manifest = JSON.parse(await readFile(file, "utf8"));
  manifest.browser_specific_settings = {
    gecko: { id: "game-client@lootlog.pl" },
  };
  manifest.content_security_policy = {
    extension_pages:
      "script-src 'self' http://localhost:3000; object-src 'self'",
  };
  await writeFile(file, JSON.stringify(manifest));
  await expect(
    checkBuild(directory, "development", "serve"),
  ).resolves.toBeUndefined();
  await expect(checkBuild(directory, "development", "build")).rejects.toThrow(
    "Local Firefox CSP",
  );
});
