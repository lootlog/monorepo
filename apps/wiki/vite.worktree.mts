import { mergeConfig } from "vite";
import { createWikiViteConfig } from "./vite.config.ts";

const PORT = 3106;

export default mergeConfig(createWikiViteConfig(), {
  server: { port: PORT, strictPort: true },
});
