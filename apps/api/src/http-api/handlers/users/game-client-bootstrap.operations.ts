import { Cause, Effect } from "effect";
import {
  SETTINGS_DOMAINS,
  type SettingsDocumentsQuery,
} from "@lootlog/schema/settings-documents";
import type { GameClientBootstrapQuery } from "#src/contracts/users/game-client-bootstrap-schemas";
import {
  getCurrentUserAccessibleGuilds,
  getCurrentUserPreferences,
} from "../account-organization/account-organization.operations.js";
import {
  getGuildPreferences,
  getPreferences,
} from "../settings/settings.operations.js";
import { getUserLootlogAccountConfig } from "../user-lootlog-config/user-lootlog-config.handlers.js";
import {
  getCharacterAuras,
  getOwnCharacterAura,
} from "../character-auras/character-auras.handlers.js";

// A failed part is reported as unavailable instead of failing the others; the
// client reads it again from the endpoint the part stands for.
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

/**
 * The startup reads of the game client in one request. Every part runs the
 * operation of the endpoint it replaces, so it applies that endpoint's access
 * policy; the guild documents cover the accessible guilds just read.
 */
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
        return { accessibleGuilds, guildTimerDocuments: null };

      const guildTimerDocuments =
        accessibleGuilds.length === 0
          ? { guilds: {} }
          : yield* getGuildPreferences({
              domains: "timers",
              guildIds: accessibleGuilds.map(({ id }) => id).join(","),
            }).pipe(orUnavailable("guildTimerDocuments"));

      return { accessibleGuilds, guildTimerDocuments };
    });

    const [
      { accessibleGuilds, guildTimerDocuments },
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
        getOwnCharacterAura().pipe(orUnavailable("characterAura")),
        getCharacterAuras().pipe(orUnavailable("characterAuras")),
      ],
      { concurrency: "unbounded" },
    );

    return {
      accessibleGuilds,
      userPreferences,
      lootlogConfig,
      settingsDocuments,
      guildTimerDocuments,
      characterAura,
      characterAuras,
    };
  },
);
