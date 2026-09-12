import { defineConfig, type Plugin, type ProxyOptions } from "vite";
import { gameClientViteConfig } from "./vite.shared";

const SANDBOX_PORT = 3010;

const SANDBOX_PATH = "/sandbox/";

// Local Traefik routes every Lootlog service by path on http://localhost.
const LOCAL_STACK_URL = "http://localhost";

// The gateway classifies a socket as a Game client only for Margonem origins.
const SANDBOX_GAME_ORIGIN = "https://pandora.margonem.pl";

const proxyTo = (origin: string, ws = false): ProxyOptions => ({
  target: LOCAL_STACK_URL,
  changeOrigin: true,
  ws,
  headers: { origin },
});

// The Vite root stays at the app directory so Tailwind scans src/ exactly as the
// userscript dev server does; the sandbox page lives under /sandbox/.
const redirectRootToSandbox = (): Plugin => ({
  name: "lootlog-sandbox-root-redirect",
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url !== "/" && !request.url?.startsWith("/?")) return next();
      response.statusCode = 302;
      response.setHeader("location", `${SANDBOX_PATH}${request.url.slice(1)}`);
      response.end();
    });
  },
});

// Standalone game-client on a fake Margonem runtime. Same-origin proxying keeps
// the local session cookie and avoids widening CORS or trusted-origin configs.
export default defineConfig(({ mode }) => {
  const shared = gameClientViteConfig(mode);

  return {
    ...shared,
    server: {
      host: "localhost",
      port: SANDBOX_PORT,
      strictPort: true,
      open: false,
      proxy: {
        "/api/auth": proxyTo(LOCAL_STACK_URL),
        "/api/lootlog": proxyTo(LOCAL_STACK_URL),
        "/api/battlelog": proxyTo(LOCAL_STACK_URL),
        "/gateway": proxyTo(SANDBOX_GAME_ORIGIN, true),
      },
    },
    plugins: [...(shared.plugins ?? []), redirectRootToSandbox()],
  };
});
