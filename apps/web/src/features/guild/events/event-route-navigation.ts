import { Option, Schema } from "effect";
import type {
  AppNavigationMatch,
  Breadcrumb,
  RouteNavigationContext,
} from "@/navigation/app-navigation";

const EVENT_ROUTE_ID = "/_authenticated/$guildId/events_/$eventId_";

const decodeEventRouteLoaderData = Schema.decodeUnknownOption(
  Schema.Struct({
    event: Schema.optional(
      Schema.Struct({
        name: Schema.optional(Schema.String),
        heroNpcs: Schema.optional(
          Schema.Array(
            Schema.Struct({
              id: Schema.Union([Schema.Finite, Schema.String]),
              npcName: Schema.String,
            }),
          ),
        ),
      }),
    ),
    rankings: Schema.optional(
      Schema.Array(
        Schema.Struct({
          memberId: Schema.Finite,
          member: Schema.optional(
            Schema.Struct({ name: Schema.optional(Schema.String) }),
          ),
        }),
      ),
    ),
  }),
);

/** The event every event page shows, from the event layout's loader. */
export function getNavigationEvent(matches: readonly AppNavigationMatch[]) {
  const eventMatch = matches.find((match) => match.routeId === EVENT_ROUTE_ID);

  return {
    path: eventMatch?.pathname ?? "",
    ...Option.getOrUndefined(
      decodeEventRouteLoaderData(eventMatch?.loaderData),
    ),
  };
}

/** The event hero a hero page and its kill pages belong to. */
export function getEventHeroBreadcrumb({
  t,
  match,
  matches,
}: RouteNavigationContext): Breadcrumb {
  const heroId = match.params?.heroId;
  const { path, event } = getNavigationEvent(matches);

  return {
    label:
      event?.heroNpcs?.find((hero) => String(hero.id) === heroId)?.npcName ??
      t("common.breadcrumbs.hero"),
    path: `${path}/heroes/${heroId}`,
  };
}
