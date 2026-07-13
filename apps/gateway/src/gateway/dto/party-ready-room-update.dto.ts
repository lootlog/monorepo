import type { PartyReadyRoomUpdateEnvelope } from "@lootlog/types";
import { z } from "zod";

const PartyReadyRoomUpdateEnvelopeSchema = z
  .object({
    recipientDiscordId: z.string().min(1),
    eligibleGuildIds: z.array(z.string().min(1)).min(1),
    projection: z
      .object({
        notificationId: z.string().min(1),
        organizerDiscordId: z.string().min(1),
        guildIds: z.array(z.string().min(1)).min(1),
        status: z.enum(["ACTIVE", "CLOSED", "CANCELLED"]),
        revision: z.number().int().positive(),
        viewer: z.enum(["ORGANIZER", "PARTICIPANT"]),
        participant: z
          .object({ discordId: z.string().min(1) })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .superRefine((envelope, context) => {
    const isEligibleGuild = envelope.eligibleGuildIds.every((guildId) =>
      envelope.projection.guildIds.includes(guildId),
    );
    if (!isEligibleGuild) {
      context.addIssue({
        code: "custom",
        message: "Ready Room envelope contains an ineligible guild",
      });
    }
    if (
      envelope.projection.viewer === "PARTICIPANT" &&
      envelope.projection.participant?.discordId !== envelope.recipientDiscordId
    ) {
      context.addIssue({
        code: "custom",
        message: "Ready Room participant projection has a different recipient",
      });
    }
  });

export function parsePartyReadyRoomUpdateEnvelope(
  data: unknown,
): PartyReadyRoomUpdateEnvelope {
  return PartyReadyRoomUpdateEnvelopeSchema.parse(
    data,
  ) as unknown as PartyReadyRoomUpdateEnvelope;
}
