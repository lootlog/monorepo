import { once } from "es-toolkit";
import {
  resolveLootAcceptance,
  type LootAcceptance,
} from "@lootlog/domain/loot-acceptance";
import type { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import type { guildTable } from "#src/database/drizzle/organization.schema";
import type { lootlogConfigNpcTable } from "#src/database/drizzle/loot.schema";
import type {
  CreateLootRequest,
  CreateLootResponse,
} from "#src/contracts/loots/schemas";

import { getItemStats } from "./loot-submission-normalization.js";

type CreateLootSubmittedGuild = CreateLootResponse["submittedGuilds"][number];

type CreateLootRejectedGuild = CreateLootResponse["rejectedGuilds"][number];

type CreateLootRejectedGuildReason = CreateLootRejectedGuild["reason"];

type Guild = typeof guildTable.$inferSelect;

type LootlogConfigNpc = typeof lootlogConfigNpcTable.$inferSelect;

export type LootSubmissionData = {
  guildId: string;
  guildName: string;
  memberId: number;
};

export type AcceptanceOutcome = {
  submissionData: LootSubmissionData[];
  submittedGuilds: CreateLootSubmittedGuild[];
  rejectedGuilds: CreateLootRejectedGuild[];
};

function createRejectedGuild(
  guild: Pick<Guild, "id" | "name">,
  reason: CreateLootRejectedGuildReason,
): CreateLootRejectedGuild {
  return { guildId: guild.id, guildName: guild.name, reason };
}

export function mapRejectedGuilds(
  guildById: ReadonlyMap<string, Guild>,
  rejected: LootAcceptance<unknown>["rejected"],
): CreateLootRejectedGuild[] {
  return rejected.flatMap(({ organizationId, reason }) => {
    const guild = guildById.get(organizationId);

    return guild ? [createRejectedGuild(guild, reason)] : [];
  });
}

export function resolveAcceptanceOutcome(options: {
  catchingGuildIds: readonly string[];
  guildById: ReadonlyMap<string, Guild>;
  lootlogConfigs: Array<{ id: string; npcs: LootlogConfigNpc[] }>;
  members: Array<{ id: number; guildId: string }>;
  organizationIds: readonly string[];
  primaryNpcType: NpcType;
  submission: CreateLootRequest;
}): AcceptanceOutcome {
  const acceptance = resolveLootAcceptance({
    organizationIds: options.organizationIds,
    catchingGuildIds: options.catchingGuildIds,
    configs: new Map(
      options.lootlogConfigs.map((config) => [config.id, config]),
    ),
    members: new Map(options.members.map((member) => [member.guildId, member])),
    loot: {
      npcType: options.primaryNpcType,
      rarities: once(() =>
        options.submission.loots.map((item) => getItemStats(item).rarity),
      ),
    },
  });

  const outcome: AcceptanceOutcome = {
    submissionData: [],
    submittedGuilds: [],
    rejectedGuilds: mapRejectedGuilds(options.guildById, acceptance.rejected),
  };

  for (const { organizationId, member } of acceptance.accepted) {
    const guild = options.guildById.get(organizationId);

    if (!guild || !member) continue;

    outcome.submissionData.push({
      guildId: guild.id,
      guildName: guild.name,
      memberId: member.id,
    });
    outcome.submittedGuilds.push({
      guildId: guild.id,
      guildName: guild.name,
    });
  }

  return outcome;
}

export function createResponse(
  id: number,
  outcome: Omit<AcceptanceOutcome, "submissionData">,
): CreateLootResponse {
  return {
    id,
    submittedGuilds: outcome.submittedGuilds,
    rejectedGuilds: outcome.rejectedGuilds,
  };
}

export function getNewSubmissions(
  submissions: LootSubmissionData[],
  existingSubmissions: Array<{ guildId: string; memberId: number }>,
): LootSubmissionData[] {
  const existingKeys = new Set(
    existingSubmissions.map(
      ({ guildId, memberId }) => `${guildId}:${memberId}`,
    ),
  );

  return submissions.filter(
    ({ guildId, memberId }) => !existingKeys.has(`${guildId}:${memberId}`),
  );
}
