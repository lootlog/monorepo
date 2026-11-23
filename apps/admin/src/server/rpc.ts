import "@tanstack/react-start/server-only";
import { ApiOperatorRpcGroup } from "@lootlog/rpc/api";
import { AuthOperatorRpcGroup } from "@lootlog/rpc/auth";
import { makeRpcClient } from "@lootlog/rpc/client";
import { Context, Effect, Layer, ManagedRuntime, Redacted } from "effect";
import { FetchHttpClient } from "effect/http";
import { adminConfig } from "./config.js";
import { currentRequest } from "./request-context.js";

const ACCESS_COOKIE = "CF_Authorization";

const withoutAccessCookie = (cookie: string) =>
  cookie
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair !== "" && !pair.startsWith(`${ACCESS_COOKIE}=`))
    .join("; ");

const makeUpstreams = Effect.gen(function* () {
  const { rpc } = adminConfig();

  return {
    auth: yield* makeRpcClient(AuthOperatorRpcGroup, {
      ...rpc.auth,
      spanPrefix: "admin.auth-rpc",
    }),
    api: yield* makeRpcClient(ApiOperatorRpcGroup, {
      ...rpc.api,
      spanPrefix: "admin.api-rpc",
    }),
  };
});

class Upstreams extends Context.Service<
  Upstreams,
  Effect.Success<typeof makeUpstreams>
>()("@lootlog/admin/Upstreams") {}

const runtime = ManagedRuntime.make(
  Layer.effect(Upstreams, makeUpstreams).pipe(
    Layer.provide(FetchHttpClient.layer),
  ),
);

const CALL_TIMEOUT = "10 seconds";

type OperatorSession = { readonly sessionCookie: Redacted.Redacted<string> };

export const asOperator = <A, E>(
  call: (
    upstreams: Upstreams["Service"],
    session: OperatorSession,
  ) => Effect.Effect<A, E>,
): Promise<A> => {
  const session = {
    sessionCookie: Redacted.make(withoutAccessCookie(currentRequest().cookie)),
  };

  return runtime.runPromise(
    Effect.flatMap(Upstreams, (upstreams) => call(upstreams, session)).pipe(
      Effect.timeout(CALL_TIMEOUT),
    ),
  );
};
