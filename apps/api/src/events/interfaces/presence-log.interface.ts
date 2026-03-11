import type { EventPresenceLog, Member } from "generated/client";

export interface PresenceLogWithMember extends EventPresenceLog {
  member: Pick<Member, "id" | "name" | "avatar" | "userId">;
}
