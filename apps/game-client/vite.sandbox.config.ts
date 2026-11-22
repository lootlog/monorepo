import { defineConfig, type Plugin, type ProxyOptions } from "vite";
import { gameClientViteConfig } from "./vite.shared.ts";

const SANDBOX_PORT = 3010;

const SANDBOX_PATH = "/sandbox/";

const LOCAL_STACK_URL = "http://localhost";

const SANDBOX_GAME_ORIGIN = "https://luvia.margonem.pl";

const proxyTo = (origin: string, ws = false): ProxyOptions => ({
  target: LOCAL_STACK_URL,
  changeOrigin: true,
  ws,
  headers: { origin },
});

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
