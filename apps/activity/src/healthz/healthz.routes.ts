import { statfs } from "node:fs/promises";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { PrismaDatabase } from "../shared/prisma/prisma-database.js";

const healthzResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  info: z.record(z.string(), z.unknown()),
  error: z.record(z.string(), z.unknown()),
  details: z.record(z.string(), z.unknown()),
});

const healthzRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Health check",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: healthzResponseSchema,
        },
      },
      description: "Service is healthy",
    },
    503: {
      content: {
        "application/json": {
          schema: healthzResponseSchema,
        },
      },
      description: "Service is unhealthy",
    },
  },
});

type HealthzRoutesDependencies = {
  apiServiceUrl: string;
  prismaDatabase: PrismaDatabase;
};

export function createHealthzRoutes({
  apiServiceUrl,
  prismaDatabase,
}: HealthzRoutesDependencies) {
  const healthzRoutes = new OpenAPIHono({ strict: false });

  healthzRoutes.openapi(healthzRoute, async (c) => {
    const info: Record<string, unknown> = {};
    const error: Record<string, unknown> = {};
    const details: Record<string, unknown> = {};

    await runCheck("database", async () => {
      await prismaDatabase.ping();
      return { status: "up" };
    });

    await runCheck("api-service", async () => {
      const response = await fetch(`${apiServiceUrl}/healthz`);

      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      return { status: "up" };
    });

    await runCheck("memory_heap", async () => {
      const heapUsed = process.memoryUsage().heapUsed;

      if (heapUsed > 150 * 1024 * 1024) {
        throw new Error(`Heap usage too high: ${heapUsed}`);
      }

      return { status: "up", heapUsed };
    });

    await runCheck("memory_rss", async () => {
      const rss = process.memoryUsage().rss;

      if (rss > 400 * 1024 * 1024) {
        throw new Error(`RSS usage too high: ${rss}`);
      }

      return { status: "up", rss };
    });

    await runCheck("storage", async () => {
      const stats = await statfs("/");
      const totalBlocks = Number(stats.blocks);
      const availableBlocks = Number(stats.bavail);
      const usedRatio =
        totalBlocks === 0 ? 0 : (totalBlocks - availableBlocks) / totalBlocks;

      if (usedRatio > 0.9) {
        throw new Error(`Disk usage too high: ${usedRatio}`);
      }

      return {
        status: "up",
        usedRatio,
      };
    });

    const status = Object.keys(error).length === 0 ? "ok" : "error";

    return c.json(
      {
        status,
        info,
        error,
        details,
      },
      status === "ok" ? 200 : 503,
    );

    async function runCheck(
      name: string,
      probe: () => Promise<Record<string, unknown>>,
    ) {
      try {
        const result = await probe();
        info[name] = result;
        details[name] = result;
      } catch (checkError) {
        const result = {
          status: "down",
          message:
            checkError instanceof Error
              ? checkError.message
              : String(checkError),
        };
        error[name] = result;
        details[name] = result;
      }
    }
  });

  return healthzRoutes;
}
