import { createServiceApp } from "@lootlog/hono-shared";

export const healthzRoutes = createServiceApp();

healthzRoutes.get("/", (c) => c.text("OK"));
