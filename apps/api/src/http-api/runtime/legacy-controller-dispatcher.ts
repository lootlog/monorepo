import { getEffectiveCapabilities } from "@lootlog/domain/access-policy";
import type {
  AuthorizedEventCaller,
  EventEndpointIdentifier,
  EventRequest,
} from "../handlers/events/events.handlers.js";
import type {
  NotificationCaller,
  NotificationEndpointIdentifier,
  NotificationGuildCaller,
  NotificationRequest,
} from "../handlers/notifications/notifications.handlers.js";
import { controllerRoutes } from "./controller-routes.generated.js";

type ControllerRegistry = Readonly<Record<string, object>>;

interface DispatchCaller extends NotificationCaller {
  readonly guild?: NotificationGuildCaller["guild"];
  readonly member?: AuthorizedEventCaller["member"];
  readonly accessPolicy?: AuthorizedEventCaller["accessPolicy"];
  readonly roles?: AuthorizedEventCaller["roles"];
}

type RouteArgument =
  | { readonly source: "caller"; readonly key: string }
  | { readonly source: "params" | "query"; readonly key?: string }
  | { readonly source: "payload" };

const requestValue = (
  argument: RouteArgument,
  request: EventRequest | NotificationRequest,
  caller: DispatchCaller,
): unknown => {
  if (argument.source === "payload") return request.payload;
  if (argument.source === "caller") {
    if (argument.key === "permissions") {
      return caller.accessPolicy
        ? getEffectiveCapabilities(caller.accessPolicy)
        : undefined;
    }
    return caller[argument.key as keyof DispatchCaller];
  }

  const values = request[argument.source];
  if (argument.key === undefined) return values;
  return values?.[argument.key];
};

/** Calls the remaining plain service facades through a checked static route table. */
export const createControllerDispatcher =
  (controllers: ControllerRegistry) =>
  (
    endpoint: EventEndpointIdentifier | NotificationEndpointIdentifier,
    request: EventRequest | NotificationRequest,
    caller:
      | AuthorizedEventCaller
      | NotificationCaller
      | NotificationGuildCaller,
  ): Promise<unknown> => {
    const route = controllerRoutes[endpoint as keyof typeof controllerRoutes];
    if (route === undefined) {
      throw new TypeError(`Missing controller route for ${endpoint}`);
    }

    const controller = controllers[route.controller];
    const method = controller && Reflect.get(controller, route.method);
    if (typeof method !== "function") {
      throw new TypeError(
        `Missing controller method ${route.controller}.${route.method}`,
      );
    }

    const arguments_ = route.arguments.map((argument) =>
      requestValue(argument, request, caller),
    );
    return Promise.resolve(method.apply(controller, arguments_ as never[]));
  };
