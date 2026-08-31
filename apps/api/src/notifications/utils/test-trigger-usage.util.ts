import { and } from "@prisma/orm-family-sql/orm-client";
import { NotificationJobKind as DbNotificationJobKind } from "#src/db/domain";
import type { PrismaService } from "#src/db/prisma.service";

export type TestTriggerUsage = {
  limit: number;
  used: number;
  remaining: number;
  windowSeconds: number;
  nextAvailableAt: string | null;
};

export async function computeTestTriggerUsage(
  prisma: PrismaService["db"],
  targetIds: number[],
  limit: number,
  windowMs: number,
): Promise<Map<number, TestTriggerUsage>> {
  const usageByTargetId = new Map<number, TestTriggerUsage>();

  if (targetIds.length === 0) {
    return usageByTargetId;
  }

  const threshold = new Date(Date.now() - windowMs);
  const testJobs = await prisma.orm.public.NotificationJob.where((row) =>
    and(
      row.targetId.in(targetIds),
      row.jobKind.eq(DbNotificationJobKind.TEST),
      row.createdAt.gte(threshold),
    ),
  )
    .select("targetId", "createdAt")
    .orderBy([(row) => row.createdAt.asc()])
    .all();

  const jobsByTargetId = new Map<number, Date[]>();

  for (const job of testJobs) {
    if (!job.targetId) {
      continue;
    }

    const current = jobsByTargetId.get(job.targetId) ?? [];
    current.push(job.createdAt);
    jobsByTargetId.set(job.targetId, current);
  }

  for (const targetId of targetIds) {
    const usage = jobsByTargetId.get(targetId) ?? [];
    const firstUsage = usage[0];
    const nextAvailableAt =
      usage.length >= limit && firstUsage
        ? new Date(firstUsage.getTime() + windowMs).toISOString()
        : null;

    usageByTargetId.set(targetId, {
      limit,
      used: usage.length,
      remaining: Math.max(0, limit - usage.length),
      windowSeconds: Math.floor(windowMs / 1000),
      nextAvailableAt,
    });
  }

  return usageByTargetId;
}

export function getDefaultTestTriggerUsage(
  limit: number,
  windowMs: number,
): TestTriggerUsage {
  return {
    limit,
    used: 0,
    remaining: limit,
    windowSeconds: Math.floor(windowMs / 1000),
    nextAvailableAt: null,
  };
}

export function getWorstTestTriggerUsage(
  targetUsage: Map<number, TestTriggerUsage>,
  targetIds?: number[],
): TestTriggerUsage | null {
  const ids = targetIds ?? [...targetUsage.keys()];
  let worst: TestTriggerUsage | null = null;

  for (const id of ids) {
    const usage = targetUsage.get(id);
    if (!usage) {
      continue;
    }
    if (!worst || usage.remaining < worst.remaining) {
      worst = usage;
    }
  }

  return worst;
}
