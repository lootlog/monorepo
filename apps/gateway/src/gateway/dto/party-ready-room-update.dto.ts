import type { PartyReadyRoomUpdateEnvelope } from "@lootlog/types";
import { z } from "zod";

const PartyReadyRoomUpdateEnvelopeSchema = z
  .object({
    recipientDiscordId: z.string().min(1),
    eligibleGuildIds: z.array(z.string().min(1)).min(1),
    update: z.discriminatedUnion("type", [
      z.object({
        schemaVersion: z.literal(3),
        type: z.literal("UPSERT"),
        projection: z
          .object({
            schemaVersion: z.literal(3),
            notificationId: z.string().min(1),
            organizerDiscordId: z.string().min(1),
            guildIds: z.array(z.string().min(1)).min(1),
            status: z.literal("ACTIVE"),
            revision: z.number().int().positive(),
            viewer: z.enum(["ORGANIZER", "PARTICIPANT"]),
            participants: z.record(
              z.string().min(1),
              z.object({ discordId: z.string().min(1) }).passthrough(),
            ),
          })
          .passthrough(),
      }),
      z.object({
        schemaVersion: z.literal(3),
        type: z.literal("REMOVE"),
        notificationId: z.string().min(1),
        revision: z.number().int().positive(),
      }),
    ]),
  })
  .superRefine((envelope, context) => {
    if (envelope.update.type === "REMOVE") return;
    const { projection } = envelope.update;
    const isEligibleGuild = envelope.eligibleGuildIds.every((guildId) =>
      projection.guildIds.includes(guildId),
    );
    if (!isEligibleGuild) {
      context.addIssue({
        code: "custom",
        message: "Ready Room envelope contains an ineligible guild",
      });
    }
    if (
      projection.viewer === "PARTICIPANT" &&
      (Object.keys(projection.participants).length === 0 ||
        Object.values(projection.participants).some(
          ({ discordId }) => discordId !== envelope.recipientDiscordId,
        ))
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
