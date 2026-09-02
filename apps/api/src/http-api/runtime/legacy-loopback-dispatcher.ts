import type {
  EventEndpointIdentifier,
  EventRequest,
} from "../handlers/events/events.handlers.js";
import type {
  NotificationEndpointIdentifier,
  NotificationRequest,
  NotificationCaller,
} from "../handlers/notifications/notifications.handlers.js";
import { LootlogApi } from "../lootlog-api.generated.js";

type Endpoint = {
  readonly path: string;
  readonly method: string;
};

type InjectResponse = {
  readonly statusCode: number;
  readonly payload: string;
  readonly headers?: Readonly<Record<string, string | string[] | undefined>>;
};

export interface FastifyInjector {
  readonly inject: (options: {
    readonly method: string;
    readonly url: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly payload?: unknown;
  }) => PromiseLike<InjectResponse>;
}

export class LegacyLoopbackHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Legacy in-process request failed with ${status}`);
  }

  getStatus() {
    return this.status;
  }
}

const interpolatePath = (
  path: string,
  params: Readonly<Record<string, unknown>>,
): string =>
  path.replaceAll(/:([A-Za-z0-9_]+)/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) {
      throw new TypeError(`Missing ${name} path parameter for legacy request`);
    }
    return encodeURIComponent(String(value));
  });

const appendQuery = (
  path: string,
  query: Readonly<Record<string, unknown>>,
): string => {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(name, String(item));
      continue;
    }
    search.set(name, String(value));
  }
  const serialized = search.toString();
  return serialized.length === 0 ? path : `${path}?${serialized}`;
};

const parsePayload = (payload: string): unknown => {
  if (payload.length === 0) return undefined;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
};

const execute = async (
  app: FastifyInjector,
  endpoint: Endpoint,
  request: {
    readonly params?: Readonly<Record<string, unknown>>;
    readonly query?: Readonly<Record<string, unknown>>;
    readonly payload?: unknown;
  },
  identity: { readonly userId: string; readonly discordId: string },
): Promise<unknown> => {
  const path = interpolatePath(endpoint.path, request.params ?? {});
  const url = appendQuery(path, request.query ?? {});
  const response = await app.inject({
    method: endpoint.method,
    url,
    headers: {
      "x-auth-user-id": identity.userId,
      "x-auth-discord-id": identity.discordId,
    },
    ...(request.payload === undefined ? {} : { payload: request.payload }),
  });
  const body = parsePayload(response.payload);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new LegacyLoopbackHttpError(response.statusCode, body);
  }
  return body;
};

export const createEventsLoopbackDispatcher =
  (app: FastifyInjector) =>
  (
    endpoint: EventEndpointIdentifier,
    request: EventRequest,
    caller: { readonly userId: string; readonly discordId: string },
  ) =>
    execute(app, LootlogApi.groups.events.endpoints[endpoint], request, caller);

export const createNotificationsLoopbackDispatcher =
  (app: FastifyInjector) =>
  (
    endpoint: NotificationEndpointIdentifier,
    request: NotificationRequest,
    caller: NotificationCaller,
  ) =>
    execute(
      app,
      LootlogApi.groups.notifications.endpoints[endpoint],
      request,
      caller,
    );
