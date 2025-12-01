import { Expose, Type } from 'class-transformer';
import { ActivityType, ActivitySource } from '../../../prisma/generated/client';

export class ActivityActorSnapshotEntity {
  @Expose()
  id: string;

  @Expose()
  accountId?: number;

  @Expose()
  characterId?: number;

  @Expose()
  clanName?: string;

  @Expose()
  icon?: string;

  @Expose()
  lvl?: number;

  @Expose()
  prof?: string;

  @Expose()
  source: ActivitySource;

  @Expose()
  createdAt: Date;

  constructor(partial: Partial<ActivityActorSnapshotEntity>) {
    Object.assign(this, partial);
  }
}

export class ActivityLootContextEntity {
  @Expose()
  id: string;

  @Expose()
  lootId: number;

  @Expose()
  @Type(() => ActivityActorSnapshotEntity)
  actorSnapshot: ActivityActorSnapshotEntity;

  constructor(partial: Partial<ActivityLootContextEntity>) {
    Object.assign(this, partial);
  }
}

export class ActivityTimerContextEntity {
  @Expose()
  id: string;

  @Expose()
  npcName: string;

  @Expose()
  @Type(() => ActivityActorSnapshotEntity)
  actorSnapshot: ActivityActorSnapshotEntity;

  constructor(partial: Partial<ActivityTimerContextEntity>) {
    Object.assign(this, partial);
  }
}

export class ActivityEntity {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  guildId: string;

  @Expose()
  discordId: string;

  @Expose()
  type: ActivityType;

  @Expose()
  source: ActivitySource;

  @Expose()
  createdAt: Date;

  @Expose()
  details?: Record<string, unknown>;

  @Expose()
  @Type(() => ActivityActorSnapshotEntity)
  actorSnapshot?: ActivityActorSnapshotEntity;

  @Expose()
  @Type(() => ActivityLootContextEntity)
  lootContext?: ActivityLootContextEntity;

  @Expose()
  @Type(() => ActivityTimerContextEntity)
  timerContext?: ActivityTimerContextEntity;

  constructor(partial: Partial<ActivityEntity>) {
    Object.assign(this, partial);
  }
}

export class PaginatedActivitiesEntity {
  @Expose()
  @Type(() => ActivityEntity)
  data: ActivityEntity[];

  @Expose()
  nextCursor?: string;

  @Expose()
  hasMore: boolean;

  constructor(partial: Partial<PaginatedActivitiesEntity>) {
    Object.assign(this, partial);
  }
}
