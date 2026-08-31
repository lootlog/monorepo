import { and, not, or } from "@prisma/orm-family-sql/orm-client";
import { createHash, randomBytes } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { Permission, type Guild } from "#src/db/domain";
import { GuildsService } from "#src/guilds/guilds.service";
import { ReservationEventsPublisher } from "./reservation-events.publisher.js";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getGuildIconUrl(guild: Pick<Guild, "id" | "icon">): string | null {
  if (!guild.icon) {
    return null;
  }

  const extension = guild.icon.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension}?size=128`;
}

function orderGuildPair(firstGuildId: string, secondGuildId: string) {
  return firstGuildId < secondGuildId
    ? ([firstGuildId, secondGuildId] as const)
    : ([secondGuildId, firstGuildId] as const);
}

@Injectable()
export class ReservationSharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly eventsPublisher: ReservationEventsPublisher,
  ) {}

  async getVisibleGuildIds(guildId: string): Promise<string[]> {
    const shares = await this.prisma.db.orm.public.ReservationShare.where(
      (row) =>
        and(
          row.revokedAt.isNull(),
          or(row.firstGuildId.eq(guildId), row.secondGuildId.eq(guildId)),
        ),
    )
      .select("firstGuildId", "secondGuildId")
      .all();

    return [
      guildId,
      ...shares.map((share) =>
        share.firstGuildId === guildId
          ? share.secondGuildId
          : share.firstGuildId,
      ),
    ];
  }

  async list(guildId: string) {
    const now = new Date();
    const [shares, pendingInvitations] = await Promise.all([
      this.prisma.db.orm.public.ReservationShare.where((row) =>
        and(
          row.revokedAt.isNull(),
          or(row.firstGuildId.eq(guildId), row.secondGuildId.eq(guildId)),
        ),
      )
        .include("firstGuild")
        .include("secondGuild")
        .orderBy((row) => row.createdAt.desc())
        .all(),
      this.prisma.db.orm.public.ReservationShareInvitation.where((row) =>
        and(
          row.sourceGuildId.eq(guildId),
          row.acceptedAt.isNull(),
          row.revokedAt.isNull(),
          row.expiresAt.gt(now),
        ),
      )
        .orderBy((row) => row.createdAt.desc())
        .all(),
    ]);

    return {
      shares: shares.map((share) => {
        const partner =
          share.firstGuildId === guildId ? share.secondGuild : share.firstGuild;

        return {
          id: share.id,
          partner: {
            name: partner.name,
            iconUrl: getGuildIconUrl(partner),
          },
          createdAt: share.createdAt,
        };
      }),
      pendingInvitations: pendingInvitations.map((invitation) => ({
        id: invitation.id,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      })),
    };
  }

  async createInvitation(guildId: string, userId: string) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const invitation =
      await this.prisma.db.orm.public.ReservationShareInvitation.create({
        id: createId(),
        sourceGuildId: guildId,
        tokenHash: this.hashToken(token),
        createdByUserId: userId,
        expiresAt,
        updatedAt: new Date(),
      });
    const invitePath = `/reservation-sharing/invitations/${token}`;

    return {
      id: invitation.id,
      invitePath,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  async previewInvitation(token: string, discordId: string) {
    const invitation = await this.getUsableInvitation(token);
    const administrativeGuilds =
      await this.guildsService.getGuildsForRequiredPermissions(discordId, [
        Permission.OWNER,
        Permission.ADMIN,
      ]);
    const existingPartnerIds = new Set(
      await this.getVisibleGuildIds(invitation.sourceGuildId),
    );
    const eligibleTargetOrganizations = administrativeGuilds
      .filter((guild) => !existingPartnerIds.has(guild.id))
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        iconUrl: getGuildIconUrl(guild),
      }));

    return {
      sourceOrganization: {
        name: invitation.sourceGuild.name,
        iconUrl: getGuildIconUrl(invitation.sourceGuild),
      },
      expiresAt: invitation.expiresAt,
      eligibleTargetOrganizations,
    };
  }

  async acceptInvitation(options: {
    token: string;
    targetGuildId: string;
    userId: string;
    discordId: string;
  }) {
    const invitation = await this.getUsableInvitation(options.token);
    const administrativeGuilds =
      await this.guildsService.getGuildsForRequiredPermissions(
        options.discordId,
        [Permission.OWNER, Permission.ADMIN],
      );
    const targetGuild = administrativeGuilds.find(
      (guild) => guild.id === options.targetGuildId,
    );

    if (!targetGuild) {
      throw new NotFoundException({ code: "TARGET_ORGANIZATION_NOT_FOUND" });
    }
    if (targetGuild.id === invitation.sourceGuildId) {
      throw new ConflictException({ code: "RESERVATION_SHARE_WITH_SELF" });
    }

    const [firstGuildId, secondGuildId] = orderGuildPair(
      invitation.sourceGuildId,
      targetGuild.id,
    );
    const share = await this.prisma.db.transaction(async (transaction) => {
      const acceptedAt = new Date();
      const claim =
        await transaction.orm.public.ReservationShareInvitation.where((row) =>
          and(
            row.id.eq(invitation.id),
            row.acceptedAt.isNull(),
            row.revokedAt.isNull(),
            row.expiresAt.gt(acceptedAt),
          ),
        ).updateAndCount({
          acceptedAt,
          acceptedByUserId: options.userId,
          targetGuildId: targetGuild.id,
          updatedAt: new Date(),
        });

      if (claim === 0) {
        throw new GoneException({ code: "INVITATION_EXPIRED" });
      }

      const existingShare = await transaction.orm.public.ReservationShare.where(
        (row) =>
          and(
            row.firstGuildId.eq(firstGuildId),
            row.secondGuildId.eq(secondGuildId),
          ),
      ).first();
      if (existingShare && !existingShare.revokedAt) {
        throw new ConflictException({ code: "RESERVATION_SHARE_EXISTS" });
      }

      const nextShare = await transaction.orm.public.ReservationShare.where(
        (row) =>
          and(
            row.firstGuildId.eq(firstGuildId),
            row.secondGuildId.eq(secondGuildId),
          ),
      ).upsert({
        create: {
          id: createId(),
          firstGuildId,
          secondGuildId,
          createdByUserId: invitation.createdByUserId,
          acceptedByUserId: options.userId,
          updatedAt: new Date(),
        },
        update: {
          createdByUserId: invitation.createdByUserId,
          acceptedByUserId: options.userId,
          revokedAt: null,
        },
      });

      return nextShare;
    });

    await this.eventsPublisher.sharingChanged(invitation.sourceGuildId, [
      invitation.sourceGuildId,
      targetGuild.id,
    ]);

    return {
      id: share.id,
      partner: {
        name: invitation.sourceGuild.name,
        iconUrl: getGuildIconUrl(invitation.sourceGuild),
      },
      createdAt: share.createdAt,
    };
  }

  async revokeInvitation(guildId: string, invitationId: string): Promise<void> {
    const result =
      await this.prisma.db.orm.public.ReservationShareInvitation.where((row) =>
        and(
          row.id.eq(invitationId),
          row.sourceGuildId.eq(guildId),
          row.acceptedAt.isNull(),
          row.revokedAt.isNull(),
        ),
      ).updateAndCount({ revokedAt: new Date(), updatedAt: new Date() });

    if (result === 0) {
      throw new NotFoundException({ code: "INVITATION_NOT_FOUND" });
    }
  }

  async revokeShare(guildId: string, shareId: string): Promise<void> {
    const share = await this.prisma.db.orm.public.ReservationShare.where(
      (row) =>
        and(
          row.id.eq(shareId),
          row.revokedAt.isNull(),
          or(row.firstGuildId.eq(guildId), row.secondGuildId.eq(guildId)),
        ),
    ).first();
    if (!share) {
      throw new NotFoundException({ code: "RESERVATION_SHARE_NOT_FOUND" });
    }

    await this.prisma.db.orm.public.ReservationShare.where((row) =>
      row.id.eq(share.id),
    ).update({ revokedAt: new Date(), updatedAt: new Date() });
    await this.eventsPublisher.sharingChanged(guildId, [
      share.firstGuildId,
      share.secondGuildId,
    ]);
  }

  private async getUsableInvitation(token: string) {
    const invitation =
      await this.prisma.db.orm.public.ReservationShareInvitation.where((row) =>
        row.tokenHash.eq(this.hashToken(token)),
      )
        .include("sourceGuild")
        .first();

    if (!invitation) {
      throw new NotFoundException({ code: "INVITATION_NOT_FOUND" });
    }
    if (invitation.acceptedAt) {
      throw new ConflictException({ code: "INVITATION_ALREADY_USED" });
    }
    if (invitation.revokedAt || invitation.expiresAt <= new Date()) {
      throw new GoneException({ code: "INVITATION_EXPIRED" });
    }

    return invitation;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
