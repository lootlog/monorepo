import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createDeveloperServer } from "./server-handler.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientDirectory = join(__dirname, "dist", "client");
const serverEntry = await import("./dist/server/server.js");
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

const server = createDeveloperServer({
  clientDirectory,
  port: PORT,
  serverEntry,
});

server.listen(PORT, () => {
  console.warn(`Developer portal running on http://localhost:${PORT}`);
});
