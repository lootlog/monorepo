import { Hono } from "hono";

const healthz = new Hono();

healthz.get("/", async (c) => {
  const res = { status: "ok" };
  return c.json(res);
});

export { healthz as healthzController };
