import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { APP_CONFIG } from "./config/app.config.js";
import { cors } from "hono/cors";

const app = new Hono();

app.use(
  "*", // or replace with "*" to enable cors for all routes
  cors({
    origin: "http://localhost:3000", // replace with your origin
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

app.get("/healthz", (c) => {
  return c.text("Healthy");
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

const port = APP_CONFIG.port;

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
