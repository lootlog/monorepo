import type { INestApplicationContext, Type } from "@nestjs/common";
import { getEffectiveCapabilities } from "@lootlog/domain/access-policy";
import { EventsAssignmentController } from "#src/events/events-assignment.controller";
import { EventsCatalogController } from "#src/events/events-catalog.controller";
import { EventsMonitoringController } from "#src/events/events-monitoring.controller";
import { EventsPinsController } from "#src/events/events-pins.controller";
import { EventsRankingController } from "#src/events/events-ranking.controller";
import { NotificationsGuildController } from "#src/notifications/notifications-guild.controller";
import { NotificationsUserController } from "#src/notifications/notifications-user.controller";
import type {
  EventEndpointIdentifier,
  EventRequest,
  AuthorizedEventCaller,
} from "../handlers/events/events.handlers.js";
import type {
  NotificationEndpointIdentifier,
  NotificationRequest,
  NotificationCaller,
  NotificationGuildCaller,
} from "../handlers/notifications/notifications.handlers.js";

const ROUTE_ARGUMENTS_METADATA = "__routeArguments__";
const API_OPERATION_METADATA = "swagger/apiOperation";

type Controller = Record<string, (...arguments_: never[]) => unknown>;

interface RouteArgumentMetadata {
  readonly index: number;
  readonly data?: string;
  readonly factory?: (data: unknown, context: unknown) => unknown;
  readonly pipes?: ReadonlyArray<{
    transform: (
      value: unknown,
      metadata: {
        readonly type: "body" | "query" | "param" | "custom";
        readonly data?: string;
        readonly metatype?: Type<unknown>;
      },
    ) => unknown;
  }>;
}

interface DispatchRequest {
  readonly params?: Readonly<Record<string, unknown>>;
  readonly query?: Readonly<Record<string, unknown>>;
  readonly payload?: unknown;
}

interface DispatchCaller extends NotificationCaller {
  readonly guild?: NotificationGuildCaller["guild"];
  readonly member?: AuthorizedEventCaller["member"];
  readonly accessPolicy?: AuthorizedEventCaller["accessPolicy"];
  readonly roles?: AuthorizedEventCaller["roles"];
}

const controllerTypes = [
  EventsAssignmentController,
  EventsCatalogController,
  EventsMonitoringController,
  EventsPinsController,
  EventsRankingController,
  NotificationsGuildController,
  NotificationsUserController,
] as const;

const buildRoutes = (application: INestApplicationContext) => {
  const routes = new Map<
    string,
    { readonly controller: Controller; readonly methodName: string }
  >();
  for (const controllerType of controllerTypes) {
    const controller = application.get(controllerType, {
      strict: false,
    }) as unknown as Controller;
    for (const methodName of Object.getOwnPropertyNames(
      controllerType.prototype,
    )) {
      if (methodName === "constructor") continue;
      const method = controllerType.prototype[methodName] as unknown;
      if (typeof method !== "function") continue;
      const operation = Reflect.getMetadata(API_OPERATION_METADATA, method) as
        | { readonly operationId?: string }
        | undefined;
      const operationId =
        operation?.operationId ??
        `${controllerType.name}${methodName[0]?.toUpperCase()}${methodName.slice(1)}`;
      routes.set(operationId, { controller, methodName });
    }
  }
  return routes;
};

const routeValue = (
  type: number,
  data: string | undefined,
  request: DispatchRequest,
): { readonly type: "body" | "query" | "param"; readonly value: unknown } => {
  if (type === 3) return { type: "body", value: request.payload };
  if (type === 4) {
    return {
      type: "query",
      value: data === undefined ? request.query : request.query?.[data],
    };
  }
  if (type === 5) {
    return {
      type: "param",
      value: data === undefined ? request.params : request.params?.[data],
    };
  }
  throw new TypeError(`Unsupported legacy controller argument type: ${type}`);
};

const invoke = async (
  route: { readonly controller: Controller; readonly methodName: string },
  request: DispatchRequest,
  caller: DispatchCaller,
): Promise<unknown> => {
  const method = route.controller[route.methodName];
  if (!method)
    throw new TypeError(`Missing controller method ${route.methodName}`);
  const controllerType = route.controller.constructor as Type<unknown>;
  const metadata = (Reflect.getMetadata(
    ROUTE_ARGUMENTS_METADATA,
    controllerType,
    route.methodName,
  ) ?? {}) as Record<string, RouteArgumentMetadata>;
  const parameterTypes = (Reflect.getMetadata(
    "design:paramtypes",
    controllerType.prototype,
    route.methodName,
  ) ?? []) as ReadonlyArray<Type<unknown> | undefined>;
  const requestContext = {
    params: request.params ?? {},
    query: request.query ?? {},
    body: request.payload,
    userId: caller.userId,
    discordId: caller.discordId,
    guild: caller.guild,
    member: caller.member,
    accessPolicy: caller.accessPolicy,
    roles: caller.roles,
    permissions: caller.accessPolicy
      ? getEffectiveCapabilities(caller.accessPolicy)
      : undefined,
  };
  const executionContext = {
    getClass: () => controllerType,
    getHandler: () => method,
    getArgs: () => [requestContext],
    getArgByIndex: (index: number) =>
      index === 0 ? requestContext : undefined,
    getType: () => "http",
    switchToHttp: () => ({
      getRequest: () => requestContext,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
    switchToRpc: () => ({
      getContext: () => undefined,
      getData: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
    }),
  };

  const arguments_: unknown[] = [];
  for (const [key, argument] of Object.entries(metadata)) {
    const isCustom = key.includes("__customRouteArgs__");
    const resolved = isCustom
      ? {
          type: "custom" as const,
          value: argument.factory?.(argument.data, executionContext),
        }
      : routeValue(Number.parseInt(key, 10), argument.data, request);
    let value = resolved.value;
    for (const pipe of argument.pipes ?? []) {
      value = await pipe.transform(value, {
        type: resolved.type,
        data: argument.data,
        metatype: parameterTypes[argument.index],
      });
    }
    arguments_[argument.index] = value;
  }
  return method.apply(route.controller, arguments_ as never[]);
};

export const createControllerDispatcher = (
  application: INestApplicationContext,
) => {
  const routes = buildRoutes(application);
  return (
    endpoint: EventEndpointIdentifier | NotificationEndpointIdentifier,
    request: EventRequest | NotificationRequest,
    caller:
      | AuthorizedEventCaller
      | NotificationCaller
      | NotificationGuildCaller,
  ): Promise<unknown> => {
    const route = routes.get(endpoint);
    if (!route) throw new TypeError(`Missing controller route for ${endpoint}`);
    return invoke(route, request, caller);
  };
};
