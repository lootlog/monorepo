import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  time,
  TimestampStyles,
  type AttachmentBuilder,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import type { Effect } from "effect";
import type { BotConfig } from "#src/config/bot-config";
import { COMMAND_TEXT } from "./command-messages.js";
import type { CommandFailure, LootlogClient } from "./lootlog-client.js";

/** The option values Discord resolved for one invocation. */
export interface CommandOptions {
  readonly subcommand: string | null;
  readonly string: (name: string) => string | null;
  readonly boolean: (name: string) => boolean | null;
  readonly user: (name: string) => string | null;
}

export interface CommandInvocation {
  readonly guildId: string;
  readonly discordId: string;
  readonly options: CommandOptions;
  /** Permissions Discord grants the bot in the channel of the invocation. */
  readonly appPermissions: bigint;
}

export interface AutocompleteInvocation extends CommandInvocation {
  readonly focused: { readonly name: string; readonly value: string };
}

export interface CommandReply {
  readonly content?: string;
  readonly embeds?: ReadonlyArray<EmbedBuilder>;
  readonly components?: ReadonlyArray<ActionRowBuilder<ButtonBuilder>>;
  readonly files?: ReadonlyArray<AttachmentBuilder>;
}

export interface AutocompleteChoice {
  readonly name: string;
  readonly value: string;
}

export type CommandServices = LootlogClient | BotConfig;

/**
 * A reply is public only when the caller set the visibility option, so a
 * command or subcommand without that option always answers privately.
 */
export interface SlashCommand {
  readonly definition: RESTPostAPIChatInputApplicationCommandsJSONBody;
  readonly run: (
    invocation: CommandInvocation,
  ) => Effect.Effect<CommandReply, CommandFailure, CommandServices>;
  readonly autocomplete?: (
    invocation: AutocompleteInvocation,
  ) => Effect.Effect<
    ReadonlyArray<AutocompleteChoice>,
    CommandFailure,
    CommandServices
  >;
}

export const VISIBILITY_OPTION = "publiczne";

/** Discord rejects autocomplete answers with more choices or longer names. */
export const MAX_AUTOCOMPLETE_CHOICES = 25;

const MAX_CHOICE_NAME_LENGTH = 100;

export const choice = (name: string, value: string): AutocompleteChoice => ({
  name:
    name.length > MAX_CHOICE_NAME_LENGTH
      ? `${name.slice(0, MAX_CHOICE_NAME_LENGTH - 1)}…`
      : name,
  value: value.slice(0, MAX_CHOICE_NAME_LENGTH),
});

export const LOOTLOG_COLOR = 0xf5a524;

export const lootlogEmbed = (title: string) =>
  new EmbedBuilder().setColor(LOOTLOG_COLOR).setTitle(title);

export const linkButtons = (
  ...links: ReadonlyArray<{ readonly label: string; readonly url: string }>
) => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    links.map(({ label, url }) =>
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(label)
        .setURL(url),
    ),
  ),
];

export const organizationUrl = (
  webAppUrl: string,
  guildId: string,
  path = "",
) => new URL(`/${guildId}${path}`, webAppUrl).toString();

export const openInLootlog = (webAppUrl: string, guildId: string, path = "") =>
  linkButtons({
    label: COMMAND_TEXT.buttons.openLootlog,
    url: organizationUrl(webAppUrl, guildId, path),
  });

/** One numbered line per entry, as the battle panel ranks its tables. */
export const rankedLines = <A>(
  entries: ReadonlyArray<A>,
  line: (entry: A) => string,
) => entries.map((entry, index) => `**${index + 1}.** ${line(entry)}`);

const TIMESTAMP_STYLES = {
  R: TimestampStyles.RelativeTime,
  t: TimestampStyles.ShortTime,
  f: TimestampStyles.ShortDateTime,
} as const;

/** Discord renders this in each viewer's own time zone and keeps it current. */
export const discordTime = (
  date: string,
  style: keyof typeof TIMESTAMP_STYLES = "R",
) => time(new Date(date), TIMESTAMP_STYLES[style]);
