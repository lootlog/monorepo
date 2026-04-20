import { Hono } from "hono";

const healthz = new Hono({ strict: false });

healthz.get("/", (c) => c.text("OK"));

export { healthz as healthzController };
