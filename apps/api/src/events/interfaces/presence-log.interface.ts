import type { EventPresenceLog, Member } from 'generated/client';

/**
 * Presence log with member information included.
 * Used when emitting presence updates via RabbitMQ.
 */
export interface PresenceLogWithMember extends EventPresenceLog {
  member: Pick<Member, 'id' | 'name' | 'avatar' | 'userId'>;
}
