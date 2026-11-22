import { Cause, Effect } from "effect";
import {
  SETTINGS_DOMAINS,
  type SettingsDocumentsQuery,
} from "@lootlog/schema/settings-documents";
import type { GameClientBootstrapQuery } from "#src/contracts/users/game-client-bootstrap-schemas";
import {
  getCurrentUserAccessibleGuilds,
  getCurrentUserPreferences,
} from "./users.handlers.js";
import { guildPermissions as getGuildPermissions } from "../guilds/guilds.handlers.js";
import {
  getGuildPreferences,
  getPreferences,
} from "../preferences/preferences.operations.js";
import { getUserLootlogAccountConfig } from "../user-lootlog-config/user-lootlog-config.handlers.js";
import {
  getCharacterAuras,
  getOwnCharacterAura,
} from "../character-auras/character-auras.handlers.js";

const orUnavailable =
  (part: string) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.catchCause(effect, (cause) =>
      Cause.hasInterruptsOnly(cause)
        ? Effect.interrupt
        : Effect.logWarning(
            "Game client bootstrap part unavailable",
            cause,
          ).pipe(Effect.annotateLogs({ part }), Effect.as(null)),
    );

export const getGameClientBootstrap = Effect.fn("getGameClientBootstrap")(
  function* (query: GameClientBootstrapQuery) {
    const accountContext = {
      domains: SETTINGS_DOMAINS.join(","),
      gameAccountId: query.gameAccountId,
    };

    const settingsQuery: SettingsDocumentsQuery =
      query.characterId === undefined
        ? accountContext
        : { ...accountContext, characterId: query.characterId };

    const guilds = Effect.gen(function* () {
      const accessibleGuilds = yield* getCurrentUserAccessibleGuilds().pipe(
        orUnavailable("accessibleGuilds"),
      );

      if (accessibleGuilds === null)
        return {
          accessibleGuilds,
          guildTimerDocuments: null,
          guildPermissions: null,
        };

      const guildIds: ReadonlyArray<string> = accessibleGuilds.map(
        ({ id }: { readonly id: string }) => id,
      );

      const guildPermissions = yield* Effect.forEach(
        guildIds,
        (id) =>
          getGuildPermissions(id).pipe(
            Effect.map((capabilities) => [id, capabilities] as const),
            Effect.catchCause((cause) =>
              Cause.hasInterruptsOnly(cause)
                ? Effect.interrupt
                : Effect.undefined,
            ),
          ),
        { concurrency: "unbounded" },
      ).pipe(
        Effect.map((entries) =>
          Object.fromEntries(entries.filter((entry) => entry !== undefined)),
        ),
      );

      const guildTimerDocuments =
        accessibleGuilds.length === 0
          ? { guilds: {} }
          : yield* getGuildPreferences({
              domains: "timers",
              guildIds: guildIds.join(","),
            }).pipe(orUnavailable("guildTimerDocuments"));

      return { accessibleGuilds, guildTimerDocuments, guildPermissions };
    });

    const [
      { accessibleGuilds, guildTimerDocuments, guildPermissions },
      userPreferences,
      lootlogConfig,
      settingsDocuments,
      characterAura,
      characterAuras,
    ] = yield* Effect.all(
      [
        guilds,
        getCurrentUserPreferences().pipe(orUnavailable("userPreferences")),
        getUserLootlogAccountConfig(query.gameAccountId).pipe(
          orUnavailable("lootlogConfig"),
        ),
        getPreferences(settingsQuery).pipe(orUnavailable("settingsDocuments")),
        getOwnCharacterAura.pipe(orUnavailable("characterAura")),
        getCharacterAuras.pipe(orUnavailable("characterAuras")),
      ],
      { concurrency: "unbounded" },
    );

    return {
      accessibleGuilds,
      userPreferences,
      lootlogConfig,
      settingsDocuments,
      guildTimerDocuments,
      guildPermissions,
      characterAura,
      characterAuras,
    };
  },
);
