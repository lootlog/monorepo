import { createServiceApp } from "@lootlog/hono-shared";

export function createHealthzRoutes() {
  return createServiceApp().get("/", (context) => {
    return context.text("OK");
  });
}
