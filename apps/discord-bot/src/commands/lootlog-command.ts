import { Effect } from "effect";
import { REQUIRED_NOTIFICATION_PERMISSIONS } from "#src/bot/required-notification-permissions";
import { BotConfig } from "#src/config/bot-config";
import { guildCommand, visibilityOption } from "./command-builders.js";
import { COMMAND_TEXT } from "./command-messages.js";
import { memberSession } from "./lootlog-client.js";
import {
  linkButtons,
  lootlogEmbed,
  organizationUrl,
  type SlashCommand,
} from "./slash-command.js";

const text = COMMAND_TEXT.lootlog;

export const lootlogCommand: SlashCommand = {
  definition: guildCommand("lootlog", text.description)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("link")
        .setDescription(text.linkDescription)
        .addBooleanOption(visibilityOption),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("diagnostyka")
        .setDescription(text.diagnosticsDescription),
    )
    .toJSON(),
  // Both answers help someone who may not be a Member yet.
  run: (invocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;

      if (invocation.options.subcommand !== "diagnostyka") {
        return {
          embeds: [lootlogEmbed(text.linkTitle).setDescription(text.linkBody)],
          components: linkButtons(
            {
              label: COMMAND_TEXT.buttons.openLootlog,
              url: organizationUrl(webAppUrl, invocation.guildId),
            },
            {
              label: COMMAND_TEXT.buttons.installation,
              url: new URL("/docs/installation", webAppUrl).toString(),
            },
          ),
        };
      }

      const account = yield* memberSession(invocation).pipe(
        Effect.as(text.accountLinked),
        Effect.catch((error) =>
          Effect.succeed(
            error.reason === "not-linked"
              ? text.accountNotLinked
              : text.accountUnavailable,
          ),
        ),
      );

      const missing = REQUIRED_NOTIFICATION_PERMISSIONS.filter(
        ({ flag }) => (invocation.appPermissions & flag) !== flag,
      ).map(({ name }) => name);

      return {
        embeds: [
          lootlogEmbed(text.diagnosticsTitle).addFields(
            { name: text.account, value: account },
            {
              name: text.channel,
              value:
                missing.length === 0
                  ? text.channelReady
                  : text.channelMissing(missing.join(", ")),
            },
          ),
        ],
        components: linkButtons({
          label: COMMAND_TEXT.buttons.openLootlog,
          url: organizationUrl(webAppUrl, invocation.guildId),
        }),
      };
    }),
};
