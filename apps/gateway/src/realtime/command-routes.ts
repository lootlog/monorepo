import type { ClientCommand, CommandSuccess } from "@lootlog/protocol/realtime";
import { Effect } from "effect";
import {
  OrganizationAccessDenied,
  RealtimeDependencyError,
  type CommandFailure,
} from "#src/realtime/realtime-errors";
import type { GatewaySocket } from "#src/realtime/session";

export type CommandType = ClientCommand["type"];

type CommandData = {
  readonly [Type in CommandType]: Extract<
    ClientCommand,
    { type: Type }
  >["data"];
};

/** How the gateway admits and runs one command type. */
export interface CommandRoute<Type extends CommandType> {
  /** Runs only once the session joined. */
  readonly joined: boolean;
  /** API key integrations may send it; they send nothing else. */
  readonly apiKey?: boolean;
  /** Records a `gateway.command` span, which costs about as much as the command. */
  readonly traced?: boolean;
  readonly run: (
    socket: GatewaySocket,
    data: CommandData[Type],
  ) => Effect.Effect<CommandSuccess<Type>, CommandFailure>;
}

/** One route per command type; a command without a route does not compile. */
export type CommandRoutes = {
  readonly [Type in CommandType]: CommandRoute<Type>;
};

/** Runs the route of `type`, generic so that the route and its data stay correlated. */
export const runCommandRoute = <Type extends CommandType>(
  routes: CommandRoutes,
  socket: GatewaySocket,
  type: Type,
  data: CommandData[Type],
): Effect.Effect<CommandSuccess<Type>, CommandFailure> =>
  routes[type].run(socket, data);

/** A dependency's Promise, which fails the command as a retryable error. */
export const fromDependency = <A>(
  operation: CommandType,
  evaluate: () => Promise<A>,
): Effect.Effect<A, RealtimeDependencyError> =>
  Effect.tryPromise({
    try: evaluate,
    catch: (cause) => new RealtimeDependencyError({ operation, cause }),
  });

/** A dependency answers `null` when the session may not read what it asked for. */
export const orAccessDenied = <A, E>(
  effect: Effect.Effect<A | null, E>,
): Effect.Effect<A, E | OrganizationAccessDenied> =>
  Effect.flatMap(effect, (result) =>
    result === null
      ? Effect.fail(new OrganizationAccessDenied())
      : Effect.succeed(result),
  );
