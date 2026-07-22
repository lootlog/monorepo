import { type ChildProcess, spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { get } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];
const serverProcesses: ChildProcess[] = [];
const serverPath = path.resolve(
  process.cwd(),
  "src/scripts/serve-local-build.mjs",
);

const waitForServerUrl = (serverProcess: ChildProcess): Promise<string> =>
  new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Local build server did not start. Output: ${output}`));
    }, 5_000);

    serverProcess.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timeout);
        resolve(match[0]);
      }
    });
    serverProcess.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Local build server exited with code ${code}.`));
    });
  });

const request = (
  url: string,
): Promise<{
  body: string;
  headers: NodeJS.Dict<string | string[]>;
  status: number;
}> =>
  new Promise((resolve, reject) => {
    get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          body,
          headers: response.headers,
          status: response.statusCode ?? 0,
        });
      });
    }).once("error", reject);
  });

afterEach(async () => {
  for (const serverProcess of serverProcesses.splice(0)) {
    serverProcess.kill("SIGTERM");
  }
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("serve-local-build", () => {
  it("serves only the local loader and bundle without caching", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), "game-client-local-server-"),
    );
    temporaryDirectories.push(temporaryDirectory);
    const lootlogDirectory = path.join(temporaryDirectory, "@lootlog");
    await mkdir(lootlogDirectory);
    await Promise.all([
      writeFile(
        path.join(lootlogDirectory, "game-client.user.js"),
        "window.bundleLoaded = true;",
      ),
      writeFile(
        path.join(lootlogDirectory, "game-client-local.user.js"),
        "// local loader",
      ),
    ]);

    const serverProcess = spawn(
      process.execPath,
      [serverPath, "--dist", temporaryDirectory, "--port", "0"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    serverProcesses.push(serverProcess);
    const serverUrl = await waitForServerUrl(serverProcess);

    const [bundleResponse, loaderResponse, missingResponse] = await Promise.all(
      [
        request(`${serverUrl}/@lootlog/game-client.user.js`),
        request(`${serverUrl}/@lootlog/game-client-local.user.js`),
        request(`${serverUrl}/not-found.js`),
      ],
    );

    expect(bundleResponse.status).toBe(200);
    expect(bundleResponse.body).toBe("window.bundleLoaded = true;");
    expect(bundleResponse.headers["content-type"]).toContain(
      "application/javascript",
    );
    expect(bundleResponse.headers["cache-control"]).toBe("no-store");
    expect(loaderResponse.status).toBe(200);
    expect(loaderResponse.body).toBe("// local loader");
    expect(missingResponse.status).toBe(404);
  });

  it("fails with a clear message when a required build artifact is missing", async () => {
    const temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), "game-client-local-server-missing-"),
    );
    temporaryDirectories.push(temporaryDirectory);
    const lootlogDirectory = path.join(temporaryDirectory, "@lootlog");
    await mkdir(lootlogDirectory);
    await writeFile(
      path.join(lootlogDirectory, "game-client-local.user.js"),
      "// local loader",
    );
    const serverProcess = spawn(
      process.execPath,
      [serverPath, "--dist", temporaryDirectory, "--port", "0"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let standardError = "";
    serverProcess.stderr?.on("data", (chunk: Buffer) => {
      standardError += chunk.toString();
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      serverProcess.once("exit", resolve);
    });

    expect(exitCode).toBe(1);
    expect(standardError).toContain("Required local build artifact is missing");
    expect(standardError).toContain("game-client.user.js");
  });
});
