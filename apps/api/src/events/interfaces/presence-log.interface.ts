import type { EventPresenceLog, Member } from "src/generated/prisma/client";

interface PresenceLogWithMember extends EventPresenceLog {
  member: Pick<Member, "id" | "name" | "avatar" | "userId">;
}
