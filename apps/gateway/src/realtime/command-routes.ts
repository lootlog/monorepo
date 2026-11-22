import type { ClientCommand, CommandSuccess } from "@lootlog/protocol/realtime";
import { Effect } from "effect";
import {
  OrganizationAccessDenied,
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

interface CommandRoute<Type extends CommandType> {
  readonly joined: boolean;
  readonly apiKey?: boolean;
  readonly traced?: boolean;
  readonly run: (
    socket: GatewaySocket,
    data: CommandData[Type],
  ) => Effect.Effect<CommandSuccess<Type>, CommandFailure>;
}

export type CommandRoutes = {
  readonly [Type in CommandType]: CommandRoute<Type>;
};

export const runCommandRoute = <Type extends CommandType>(
  routes: CommandRoutes,
  socket: GatewaySocket,
  type: Type,
  data: CommandData[Type],
): Effect.Effect<CommandSuccess<Type>, CommandFailure> =>
  routes[type].run(socket, data);

export const orAccessDenied = <A, E>(
  effect: Effect.Effect<A | null, E>,
): Effect.Effect<A, E | OrganizationAccessDenied> =>
  Effect.filterOrFail(
    effect,
    (result): result is A => result !== null,
    () => new OrganizationAccessDenied(),
  );
