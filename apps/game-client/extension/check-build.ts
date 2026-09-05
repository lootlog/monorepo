import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildProfile } from "./build-profile";

export async function checkBuild(
  directory: string,
  mode: string,
  command: "build" | "serve" = "build",
) {
  // WXT serve adds its development server to CSP and uses unbundled modules.
  if (command === "serve") return;
  const manifest = JSON.parse(
    await readFile(path.join(directory, "manifest.json"), "utf8"),
  );
  if (
    manifest.browser_specific_settings?.gecko &&
    mode !== "production" &&
    manifest.content_security_policy?.extension_pages !==
      "script-src 'self'; object-src 'self'"
  )
    throw new Error(
      "Local Firefox CSP must preserve ws:// without permitting eval",
    );
  const profile = buildProfile(mode);
  const expectedHosts = new Set<string>();
  for (const [key, value] of Object.entries(profile)) {
    if (key.endsWith("_URL") && key !== "VITE_LOOTLOG_APP_URL")
      expectedHosts.add(`${new URL(value).origin}/*`);
  }
  if (
    JSON.stringify(manifest.host_permissions.toSorted()) !==
    JSON.stringify(Array.from(expectedHosts).toSorted())
  )
    throw new Error(
      "Extension host permissions do not match the build profile",
    );
  const background =
    manifest.background.service_worker ?? manifest.background.scripts?.[0];
  await Promise.all(
    [background, "content-scripts/game.js"].map(async (file) => {
      const source = await readFile(path.join(directory, file), "utf8");
      for (const value of Object.values(profile)) {
        if (!source.includes(value))
          throw new Error(`${file}: missing expected endpoint ${value}`);
      }
      const otherProfile = buildProfile(
        mode === "production" ? "production-local" : "production",
      );
      const forbidden = Object.values(otherProfile).filter((value) =>
        mode === "production"
          ? value.includes("/api/") || value === "/gateway/ws"
          : value.startsWith("https:") &&
            value !== otherProfile.VITE_LOOTLOG_APP_URL,
      );
      if (forbidden.some((value) => source.includes(value)))
        throw new Error(
          `${file}: contains endpoints from the wrong environment`,
        );
    }),
  );
  const files = new Set<string>(
    manifest.content_scripts.flatMap(
      (script: { js?: string[]; css?: string[] }) => [
        ...(script.js ?? []),
        ...(script.css ?? []),
      ],
    ),
  );
  await Promise.all(
    [...files].map(async (file) => {
      const source = new TextDecoder("utf-8", { fatal: true }).decode(
        await readFile(path.join(directory, file)),
      );
      // Chromium's IsStringUTF8 also rejects Unicode noncharacters, unlike TextDecoder.
      for (const character of source) {
        const code = character.codePointAt(0) ?? 0;
        if ((code >= 0xfdd0 && code <= 0xfdef) || (code & 0xffff) >= 0xfffe) {
          throw new Error(
            `${file}: Unicode noncharacter U+${code.toString(16).toUpperCase()} rejected by Chrome`,
          );
        }
      }
    }),
  );
  process.stdout.write(
    `Validated ${files.size} content-script files for Chrome UTF-8 compatibility\n`,
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  if (!process.argv[2] || !process.argv[3])
    throw new Error(
      "Usage: bun extension/check-build.ts <output-directory> <mode>",
    );
  await checkBuild(process.argv[2], process.argv[3]);
}
