import { AuthOperatorRpcGroup } from "@lootlog/rpc/auth";
import type { RpcService } from "@lootlog/rpc/callers";
import { makeRpcClient, type ServiceRpcClient } from "@lootlog/rpc/client";
import {
  RpcBadRequestError,
  RpcForbiddenError,
  RpcUnauthorizedError,
} from "@lootlog/rpc/errors";
import { makeRpcTestHttpClient, testRpcUpstream } from "@lootlog/rpc/testing";
import type { AdminOperator } from "@lootlog/schema/admin";
import { describe, expect, it, mock } from "bun:test";
import { Effect, Layer, Redacted } from "effect";
import { authorizeOperator } from "#src/admin/admin-auth";
import { AdminService } from "#src/admin/admin-service";
import { AuthOperatorRpcHandlers } from "./auth-rpc-server.js";

const OPERATOR = { userId: "user-1", name: "Operator" };

const sessionCookie = Redacted.make("local.session_token=test-session");

const makePanel = (
  session: AdminOperator | null = OPERATOR,
  caller: RpcService = "admin",
) => {
  const listUsers = mock(() => Effect.succeed({ users: [], total: 0 }));

  const ban = mock(() => Effect.die("Not configured"));

  const handlers = AuthOperatorRpcHandlers.pipe(
    Layer.provide(
      Layer.succeed(
        AdminService,
        AdminService.of({
          authorize: (cookie) =>
            authorizeOperator(cookie, {
              adminUserIds: [OPERATOR.userId],
              getFreshSession: () => Effect.succeed(session),
            }),
          overview: Effect.die("Not configured"),
          listUsers,
          getUser: () => Effect.die("Not configured"),
          setRoles: () => Effect.die("Not configured"),
          ban,
          unban: () => Effect.die("Not configured"),
          revokeSessions: () => Effect.die("Not configured"),
          revokeSession: () => Effect.die("Not configured"),
          revokeApiKey: () => Effect.die("Not configured"),
          listRoleHolders: () => Effect.die("Not configured"),
          listAudit: () => Effect.die("Not configured"),
        }),
      ),
    ),
  );

  const call = <A, E>(
    use: (
      client: ServiceRpcClient<typeof AuthOperatorRpcGroup>,
    ) => Effect.Effect<A, E>,
  ) =>
    Effect.runPromise(
      makeRpcClient(AuthOperatorRpcGroup, {
        ...testRpcUpstream,
        spanPrefix: "test.rpc-client",
      }).pipe(
        Effect.flatMap(use),
        Effect.scoped,
        Effect.provide(
          makeRpcTestHttpClient(AuthOperatorRpcGroup, handlers, [caller]),
        ),
      ),
    );

  return { call, listUsers, ban };
};

describe("operator procedures of the auth RPC", () => {
  it("refuses another service's token, even with an admin account's session", async () => {
    const panel = makePanel(OPERATOR, "api");

    const failure = await panel.call((client) =>
      client.searchUsers({ sessionCookie }).pipe(Effect.flip),
    );

    expect(failure._tag).toBe("RpcCallerRejectedError");
    expect(panel.listUsers).not.toHaveBeenCalled();
  });

  it.each([
    [
      "nobody is signed in",
      null,
      RpcUnauthorizedError,
      "ADMIN_SESSION_REQUIRED",
    ],
    [
      "the signed-in user is not an admin account",
      { userId: "user-2", name: "Player" },
      RpcForbiddenError,
      "ADMIN_ACCESS_REQUIRED",
    ],
  ] as const)(
    "refuses the panel while %s",
    async (_case, session, error, code) => {
      const panel = makePanel(session);

      const failure = await panel.call((client) =>
        client.searchUsers({ sessionCookie }).pipe(Effect.flip),
      );

      expect(failure).toBeInstanceOf(error);
      expect(failure).toHaveProperty("message", code);
      expect(panel.listUsers).not.toHaveBeenCalled();
    },
  );

  it("serves the panel acting for a signed-in admin account, keeping the session out of the search", async () => {
    const panel = makePanel();

    const [operator, users] = await panel.call((client) =>
      Effect.all([
        client.getOperator({ sessionCookie }),
        client.searchUsers({ sessionCookie, banned: true, limit: 10 }),
      ]),
    );

    expect(operator).toEqual(OPERATOR);
    expect(users).toEqual({ users: [], total: 0 });
    expect(panel.listUsers).toHaveBeenCalledWith({ banned: true, limit: 10 });
  });

  it("refuses an operator's ban of their own account", async () => {
    const panel = makePanel();

    const failure = await panel.call((client) =>
      client
        .banUser({
          sessionCookie,
          userId: OPERATOR.userId,
          reason: "Mistake",
          expiresAt: null,
        })
        .pipe(Effect.flip),
    );

    expect(failure).toBeInstanceOf(RpcBadRequestError);
    expect(failure).toHaveProperty("message", "CANNOT_BAN_SELF");
    expect(panel.ban).not.toHaveBeenCalled();
  });
});
