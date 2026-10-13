import {
  ApplicationIntegrationType,
  InteractionContextType,
  SlashCommandBuilder,
  type SlashCommandBooleanOption,
  type SlashCommandStringOption,
} from "discord.js";
import {
  COMMAND_TEXT,
  KILL_PERIODS,
  PERIOD_LABELS,
  type KillPeriod,
} from "./command-messages.js";
import { VISIBILITY_OPTION, type CommandOptions } from "./slash-command.js";

/** Lootlog data belongs to the Organization of a server, never to a DM. */
export const guildCommand = (name: string, description: string) =>
  new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setContexts(InteractionContextType.Guild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall);

export const visibilityOption = (option: SlashCommandBooleanOption) =>
  option
    .setName(VISIBILITY_OPTION)
    .setDescription(COMMAND_TEXT.visibilityOption);

export const PERIOD_OPTION = "okres";

export const periodOption = (option: SlashCommandStringOption) =>
  option
    .setName(PERIOD_OPTION)
    .setDescription(COMMAND_TEXT.periodOption)
    .addChoices(
      KILL_PERIODS.map((period) => ({
        name: PERIOD_LABELS[period],
        value: period,
      })),
    );

export const readPeriod = (options: CommandOptions): KillPeriod =>
  KILL_PERIODS.find((period) => period === options.string(PERIOD_OPTION)) ??
  "all";
