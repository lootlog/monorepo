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
import {
  DEFAULT_NPC_TYPE_COLORS,
  isAppearanceNpcType,
} from "@lootlog/schema/npc-appearance";
import type { Effect } from "effect";
import type { BotConfig } from "#src/config/bot-config";
import { COMMAND_TEXT } from "./command-messages.js";
import type { CommandFailure, LootlogClient } from "./lootlog-client.js";

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
  readonly appPermissions: bigint;
}

export interface AutocompleteInvocation extends CommandInvocation {
  readonly focused: { readonly name: string; readonly value: string };
}

export interface CommandReply {
  readonly content?: string;
  readonly pings?: ReadonlyArray<string>;
  readonly embeds?: ReadonlyArray<EmbedBuilder>;
  readonly components?: ReadonlyArray<ActionRowBuilder<ButtonBuilder>>;
  readonly files?: ReadonlyArray<AttachmentBuilder>;
}

export interface AutocompleteChoice {
  readonly name: string;
  readonly value: string;
}

export type CommandServices = LootlogClient | BotConfig;

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

export const MAX_AUTOCOMPLETE_CHOICES = 25;

const MAX_CHOICE_NAME_LENGTH = 100;

export const choice = (name: string, value: string): AutocompleteChoice => ({
  name:
    name.length > MAX_CHOICE_NAME_LENGTH
      ? `${name.slice(0, MAX_CHOICE_NAME_LENGTH - 1)}…`
      : name,
  value: value.slice(0, MAX_CHOICE_NAME_LENGTH),
});

const LOOTLOG_COLOR = 0xf5a524;

export const lootlogEmbed = (title: string, color = LOOTLOG_COLOR) =>
  new EmbedBuilder().setColor(color).setTitle(title).setTimestamp();

export const npcTypeColor = (type: string) =>
  isAppearanceNpcType(type)
    ? Number.parseInt(DEFAULT_NPC_TYPE_COLORS[type].slice(1), 16)
    : LOOTLOG_COLOR;

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

const MEDALS = ["🥇", "🥈", "🥉"];

export const rankedLines = <A>(
  entries: ReadonlyArray<A>,
  options: {
    readonly limit: number;
    readonly name: (entry: A) => string;
    readonly detail: (entry: A) => string;
    readonly isOwn: (entry: A) => boolean;
    readonly ownDiscordId: string;
    readonly ownMissing?: string | undefined;
  },
) => {
  const own = entries.findIndex(options.isOwn);

  const numbered = (entry: A, index: number) => {
    const place = MEDALS[index] ?? `\`${index + 1}.\``;

    return index === own
      ? `${place} **<@${options.ownDiscordId}> — ${options.detail(entry)}**`
      : `${place} ${options.name(entry)} — ${options.detail(entry)}`;
  };

  const lines = entries.slice(0, options.limit).map(numbered);
  const ownEntry = entries[own];

  if (ownEntry !== undefined && own >= options.limit)
    lines.push("…", numbered(ownEntry, own));

  if (own === -1 && options.ownMissing !== undefined)
    lines.push("", `_${options.ownMissing}_`);

  return lines;
};

const TIMESTAMP_STYLES = {
  R: TimestampStyles.RelativeTime,
  t: TimestampStyles.ShortTime,
  f: TimestampStyles.ShortDateTime,
} as const;

export const discordTime = (
  date: string,
  style: keyof typeof TIMESTAMP_STYLES = "R",
) => time(new Date(date), TIMESTAMP_STYLES[style]);
