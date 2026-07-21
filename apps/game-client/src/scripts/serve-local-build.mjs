import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 4_173;
const SERVED_FILES = new Map([
  ["/@lootlog/game-client.user.js", "@lootlog/game-client.user.js"],
  ["/@lootlog/game-client-local.user.js", "@lootlog/game-client-local.user.js"],
]);

const parseArguments = (arguments_) => {
  let distDirectory = path.resolve(process.cwd(), "dist");
  let port = DEFAULT_PORT;

  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index];
    const value = arguments_[index + 1];

    if (!value) {
      throw new Error(
        "Usage: serve-local-build.mjs [--dist <path>] [--port <port>]",
      );
    }

    if (option === "--dist") {
      distDirectory = path.resolve(value);
      continue;
    }

    if (option === "--port") {
      port = Number.parseInt(value, 10);
      if (!Number.isInteger(port) || port < 0 || port > 65_535) {
        throw new Error(`Invalid port: ${value}`);
      }
      continue;
    }

    throw new Error(`Unknown option: ${option}`);
  }

  return { distDirectory, port };
};

const ensureBuildArtifactsExist = async (distDirectory) => {
  await Promise.all(
    [...SERVED_FILES.values()].map(async (relativePath) => {
      const filePath = path.resolve(distDirectory, relativePath);
      try {
        const fileStats = await stat(filePath);
        if (!fileStats.isFile()) {
          throw new Error("not a file");
        }
      } catch {
        throw new Error(
          `Required local build artifact is missing: ${filePath}`,
        );
      }
    }),
  );
};

const createLocalBuildServer = (distDirectory) =>
  createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    const relativePath = SERVED_FILES.get(requestUrl.pathname);

    if (!relativePath) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found\n");
      return;
    }

    try {
      const contents = await readFile(
        path.resolve(distDirectory, relativePath),
      );
      response.writeHead(200, {
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
        "content-type": "application/javascript; charset=utf-8",
        "x-content-type-options": "nosniff",
      });
      response.end(contents);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(`Failed to read local build artifact: ${message}\n`);
    }
  });

const run = async () => {
  const { distDirectory, port } = parseArguments(process.argv.slice(2));
  await ensureBuildArtifactsExist(distDirectory);
  const server = createLocalBuildServer(distDirectory);

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      process.stderr.write(
        `[local-prod] Port ${port} is already in use. Stop the other process or choose another port.\n`,
      );
    } else {
      process.stderr.write(`[local-prod] Server failed: ${error.message}\n`);
    }
    process.exitCode = 1;
  });

  server.listen(port, DEFAULT_HOST, () => {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not determine the local server address");
    }

    const serverUrl = `http://${DEFAULT_HOST}:${address.port}`;
    process.stdout.write(`[local-prod] Server: ${serverUrl}\n`);
    process.stdout.write(
      `[local-prod] Install loader: ${serverUrl}/@lootlog/game-client-local.user.js\n`,
    );
    process.stdout.write(
      "[local-prod] Disable the regular @lootlog/game-client userscript before reloading the game.\n",
    );
  });

  const closeServer = () => {
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", closeServer);
  process.once("SIGTERM", closeServer);
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[local-prod] ${message}\n`);
  process.exitCode = 1;
});
