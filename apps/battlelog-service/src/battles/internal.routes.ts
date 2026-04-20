import { Queue } from "bullmq";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { DeleteUserBattlesJobData } from "./delete-user-battles.job.js";

const deleteUserDataSchema = z.object({
  userId: z.string(),
});

const deleteUserDataResponseSchema = z.object({
  status: z.literal("ACCEPTED"),
});

type InternalRoutesDependencies = {
  deleteUserBattlesQueue: Queue<DeleteUserBattlesJobData>;
};

const deleteUserDataRoute = createRoute({
  method: "post",
  path: "/delete-user-data",
  tags: ["Internal"],
  summary: "Enqueue deletion of all battles for a user",
  request: {
    body: {
      content: {
        "application/json": {
          schema: deleteUserDataSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: deleteUserDataResponseSchema,
        },
      },
      description: "Deletion job enqueued",
    },
  },
});

export function createInternalRoutes({
  deleteUserBattlesQueue,
}: InternalRoutesDependencies) {
  const internal = new OpenAPIHono({ strict: false });

  internal.openapi(deleteUserDataRoute, async (c) => {
    const body = c.req.valid("json");

    await deleteUserBattlesQueue.add("delete-user-battles", {
      userId: body.userId,
    });

    return c.json({ status: "ACCEPTED" }, 200);
  });

  return internal;
}
