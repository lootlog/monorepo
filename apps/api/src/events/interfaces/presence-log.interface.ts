import type { EventPresenceLog, Member } from "src/generated/prisma/client";

export interface PresenceLogWithMember extends EventPresenceLog {
  member: Pick<Member, "id" | "name" | "avatar" | "userId">;
}
