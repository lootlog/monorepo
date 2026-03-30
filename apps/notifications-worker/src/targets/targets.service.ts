import { Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import {
  notificationTargets,
  type NewNotificationTarget,
} from "src/shared/modules/drizzle/schema";
import type { CreateTargetDto } from "./dto/create-target.dto";
import type { UpdateTargetDto } from "./dto/update-target.dto";

@Injectable()
export class TargetsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateTargetDto) {
    const [target] = await this.drizzle.db
      .insert(notificationTargets)
      .values(dto satisfies NewNotificationTarget)
      .returning();
    return target;
  }

  async findByOwner(ownerType: string, ownerId: string) {
    return this.drizzle.db
      .select()
      .from(notificationTargets)
      .where(
        and(
          eq(notificationTargets.ownerType, ownerType as "guild" | "user"),
          eq(notificationTargets.ownerId, ownerId),
        ),
      );
  }

  async findById(id: string) {
    return this.drizzle.db.query.notificationTargets.findFirst({
      where: { id: eq(notificationTargets.id, id) },
    });
  }

  async update(id: string, dto: UpdateTargetDto) {
    const [updated] = await this.drizzle.db
      .update(notificationTargets)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(notificationTargets.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    const [deleted] = await this.drizzle.db
      .delete(notificationTargets)
      .where(eq(notificationTargets.id, id))
      .returning({ id: notificationTargets.id });
    return deleted;
  }
}
