import { escapeMarkdown } from "discord.js";
import { Effect, Schema } from "effect";
import { guildCommand, visibilityOption } from "./command-builders.js";
import { COMMAND_TEXT, professionLabel } from "./command-messages.js";
import { memberSession, type MemberSession } from "./lootlog-client.js";
import {
  choice,
  lootlogEmbed,
  MAX_AUTOCOMPLETE_CHOICES,
  type SlashCommand,
} from "./slash-command.js";

const SHOWN_PLAYERS = 40;

const PresenceSnapshot = Schema.Struct({
  presences: Schema.Array(
    Schema.Struct({
      platform: Schema.String,
      status: Schema.String,
      isAfk: Schema.Boolean,
      character: Schema.optionalKey(
        Schema.Struct({
          world: Schema.String,
          name: Schema.String,
          lvl: Schema.Number,
          prof: Schema.String,
        }),
      ),
      // Present only when the caller may read precise locations.
      location: Schema.optionalKey(Schema.Struct({ map: Schema.String })),
    }),
  ),
});

/** Characters in the game, once each, even with several sessions open. */
const readOnlineCharacters = (session: MemberSession, world?: string) =>
  session
    .gateway(
      `/organizations/${encodeURIComponent(session.guildId)}/presence`,
      { world },
      PresenceSnapshot,
    )
    .pipe(
      Effect.map(({ presences }) => {
        const characters = new Map<
          string,
          {
            readonly world: string;
            readonly name: string;
            readonly lvl: number;
            readonly prof: string;
            readonly isAfk: boolean;
            readonly map?: string;
          }
        >();

        for (const presence of presences) {
          const character = presence.character;

          if (
            presence.platform !== "game" ||
            presence.status !== "online" ||
            !character
          )
            continue;

          characters.set(`${character.world}:${character.name}`, {
            ...character,
            isAfk: presence.isAfk,
            map: presence.location?.map,
          });
        }

        return [...characters.values()].sort(
          (left, right) =>
            left.world.localeCompare(right.world) || right.lvl - left.lvl,
        );
      }),
    );

export const onlineCommand: SlashCommand = {
  definition: guildCommand("online", COMMAND_TEXT.online.description)
    .addStringOption((option) =>
      option
        .setName("swiat")
        .setDescription(COMMAND_TEXT.worldOption)
        .setAutocomplete(true),
    )
    .addBooleanOption(visibilityOption)
    .toJSON(),
  autocomplete: (invocation) =>
    Effect.gen(function* () {
      const session = yield* memberSession(invocation);
      const characters = yield* readOnlineCharacters(session);
      const query = invocation.focused.value.toLowerCase();

      return [...new Set(characters.map((character) => character.world))]
        .filter((world) => world.toLowerCase().includes(query))
        .slice(0, MAX_AUTOCOMPLETE_CHOICES)
        .map((world) => choice(world, world));
    }),
  run: (invocation) =>
    Effect.gen(function* () {
      const session = yield* memberSession(invocation);
      const world = invocation.options.string("swiat") ?? undefined;
      const characters = yield* readOnlineCharacters(session, world);
      const shown = characters.slice(0, SHOWN_PLAYERS);
      const lines: string[] = [];

      shown.forEach((character, index) => {
        if (shown[index - 1]?.world !== character.world)
          lines.push(`__${escapeMarkdown(character.world)}__`);

        const profession = professionLabel(character.prof);

        const details = [
          profession
            ? `${character.lvl} ${profession.toLowerCase()}`
            : String(character.lvl),
          character.map ? escapeMarkdown(character.map) : null,
          character.isAfk ? COMMAND_TEXT.online.afk : null,
        ].filter(Boolean);

        lines.push(
          `**${escapeMarkdown(character.name)}** — ${details.join(" · ")}`,
        );
      });

      if (characters.length > shown.length)
        lines.push(COMMAND_TEXT.online.more(characters.length - shown.length));

      return {
        embeds: [
          lootlogEmbed(
            COMMAND_TEXT.online.title(characters.length),
          ).setDescription(
            lines.length === 0 ? COMMAND_TEXT.online.empty : lines.join("\n"),
          ),
        ],
      };
    }),
};
