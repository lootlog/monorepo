import { OpenAPIHono } from "@hono/zod-openapi";
import { Hono, type Env } from "hono";

export function createServiceApp<ServiceEnv extends Env = Env>() {
  return new Hono<ServiceEnv>({ strict: false });
}

export function createOpenApiServiceApp<ServiceEnv extends Env = Env>() {
  return new OpenAPIHono<ServiceEnv>({ strict: false });
}
