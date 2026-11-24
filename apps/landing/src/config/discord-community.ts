import { COMMUNITY_LINKS } from "@lootlog/domain/public-sites";
import { Option, Schema } from "effect";

const MEMBER_COUNT_STEP = 50;

const REQUEST_TIMEOUT_MS = 5000;

const inviteCode = new URL(COMMUNITY_LINKS.discord).pathname.slice(1);

const decodeInviteCounts = Schema.decodeUnknownOption(
  Schema.Struct({ approximate_member_count: Schema.Int }),
);

export async function fetchDiscordMemberCount() {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );

    if (!response.ok) return null;

    const counts = decodeInviteCounts(await response.json());

    if (Option.isNone(counts)) return null;

    const memberCount = counts.value.approximate_member_count;

    if (memberCount < MEMBER_COUNT_STEP) return null;

    return Math.floor(memberCount / MEMBER_COUNT_STEP) * MEMBER_COUNT_STEP;
  } catch {
    return null;
  }
}
