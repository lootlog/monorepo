import { Hono } from "hono";

export const healthzRoutes = new Hono({ strict: false });

healthzRoutes.get("/", (c) => c.text("OK"));
