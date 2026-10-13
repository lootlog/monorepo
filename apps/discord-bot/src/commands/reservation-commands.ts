import { escapeMarkdown } from "discord.js";
import { Effect, Schema } from "effect";
import { BotConfig } from "#src/config/bot-config";
import { guildCommand, visibilityOption } from "./command-builders.js";
import { COMMAND_TEXT } from "./command-messages.js";
import { memberSession } from "./lootlog-client.js";
import {
  discordTime,
  lootlogEmbed,
  openInLootlog,
  type SlashCommand,
} from "./slash-command.js";

const SHOWN_RESERVATIONS = 15;

const SHOWN_SPOTS = 20;

const Reservation = Schema.Struct({
  spotName: Schema.String,
  startsAt: Schema.String,
  endsAt: Schema.String,
  author: Schema.Struct({ displayName: Schema.String }),
  sourceOrganization: Schema.Struct({
    name: Schema.String,
    isCurrent: Schema.Boolean,
  }),
});

const MyReservations = Schema.Struct({ items: Schema.Array(Reservation) });

const ReservationSpots = Schema.Array(
  Schema.Struct({
    name: Schema.String,
    level: Schema.Number,
    currentReservation: Schema.NullOr(Reservation),
    nextReservation: Schema.NullOr(Reservation),
  }),
);

type Spot = (typeof ReservationSpots.Type)[number];

const spotState = (spot: Spot) => {
  const current = spot.currentReservation;
  const next = spot.nextReservation;

  const state = current
    ? COMMAND_TEXT.reservations.taken(
        escapeMarkdown(current.author.displayName),
        discordTime(current.endsAt, "t"),
      )
    : COMMAND_TEXT.reservations.free;

  return next
    ? `${state}; ${COMMAND_TEXT.reservations.next(escapeMarkdown(next.author.displayName), discordTime(next.startsAt))}`
    : state;
};

export const reservationsCommand: SlashCommand = {
  definition: guildCommand("rezerwacje", COMMAND_TEXT.reservations.description)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("moje")
        .setDescription(COMMAND_TEXT.reservations.mineDescription),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("miejsca")
        .setDescription(COMMAND_TEXT.reservations.spotsDescription)
        .addBooleanOption(visibilityOption),
    )
    .toJSON(),
  run: (invocation) =>
    Effect.gen(function* () {
      const { webAppUrl } = yield* BotConfig;
      const session = yield* memberSession(invocation);

      const components = openInLootlog(
        webAppUrl,
        session.guildId,
        "/reservations",
      );

      if (invocation.options.subcommand === "moje") {
        const { items } = yield* session.api(
          "/users/@me/reservations",
          { status: "upcoming" },
          MyReservations,
        );

        const lines = items
          .slice(0, SHOWN_RESERVATIONS)
          .map(
            (reservation) =>
              `**${escapeMarkdown(reservation.spotName)}** — ${discordTime(reservation.startsAt, "f")} – ${discordTime(reservation.endsAt, "t")}${reservation.sourceOrganization.isCurrent ? "" : ` · ${escapeMarkdown(reservation.sourceOrganization.name)}`}`,
          );

        return {
          embeds: [
            lootlogEmbed(COMMAND_TEXT.reservations.mineTitle).setDescription(
              lines.length === 0
                ? COMMAND_TEXT.reservations.mineEmpty
                : lines.join("\n"),
            ),
          ],
          components,
        };
      }

      const spots = yield* session.api(
        `/guilds/${encodeURIComponent(session.guildId)}/reservation-spots`,
        {},
        ReservationSpots,
      );

      const lines = spots
        .slice(0, SHOWN_SPOTS)
        .map(
          (spot) =>
            `**${escapeMarkdown(spot.name)}** (${spot.level}) — ${spotState(spot)}`,
        );

      return {
        embeds: [
          lootlogEmbed(COMMAND_TEXT.reservations.spotsTitle).setDescription(
            lines.length === 0
              ? COMMAND_TEXT.reservations.spotsEmpty
              : lines.join("\n"),
          ),
        ],
        components,
      };
    }),
};
