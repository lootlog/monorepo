import { escapeMarkdown } from "discord.js";
import { Array, Effect } from "effect";
import { guildCommand, visibilityOption } from "./command-builders.js";
import { COMMAND_TEXT } from "./command-messages.js";
import { memberSession } from "./lootlog-client.js";
import { lootlogEmbed, type SlashCommand } from "./slash-command.js";

export const onlineCommand: SlashCommand = {
  definition: guildCommand("online", COMMAND_TEXT.online.description)
    .addBooleanOption(visibilityOption)
    .toJSON(),
  run: (invocation) =>
    Effect.gen(function* () {
      const session = yield* memberSession(invocation);

      const { presences } = yield* session.gateway.getOrganizationPresence;

      const characters = new Map<
        string,
        { readonly world: string; readonly isAfk: boolean }
      >();

      for (const { platform, status, isAfk, character } of presences) {
        if (platform !== "game" || status !== "online" || !character) continue;

        characters.set(`${character.world}:${character.name}`, {
          world: character.world,
          isAfk,
        });
      }

      const worlds = Object.entries(
        Array.groupBy([...characters.values()], ({ world }) => world),
      )
        .map(([world, online]) => ({
          world,
          count: online.length,
          afk: online.filter(({ isAfk }) => isAfk).length,
        }))
        .sort(
          (left, right) =>
            right.count - left.count || left.world.localeCompare(right.world),
        );

      return {
        embeds: [
          lootlogEmbed(
            COMMAND_TEXT.online.title(characters.size),
          ).setDescription(
            worlds.length === 0
              ? COMMAND_TEXT.online.empty
              : worlds
                  .map(({ world, count, afk }) =>
                    COMMAND_TEXT.online.world(
                      escapeMarkdown(world),
                      count,
                      afk,
                    ),
                  )
                  .join("\n"),
          ),
        ],
      };
    }),
};
