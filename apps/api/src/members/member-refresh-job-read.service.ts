import { NotFoundException } from "#src/shared/http/http-errors";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { serviceConfig } from "#src/config/service.config";
import { getAdminBulkRefreshRateLimit } from "./constants/member-cache.constant.js";
import { ErrorKey } from "./enum/error-key.enum.js";
import type { RefreshJobWithCooldown } from "./member.types.js";
import { MemberRefreshJobRepository } from "./member-refresh-job.repository.js";

export class MemberRefreshJobReadService {
  private readonly environment: RuntimeEnvironment = serviceConfig.env;

  constructor(private readonly repository: MemberRefreshJobRepository) {}

  async getLatest(guildId: string): Promise<RefreshJobWithCooldown | null> {
    const job = await this.repository.findLatest(guildId);
    return job ? this.withCooldown(job) : null;
  }

  async get(guildId: string, jobId: number): Promise<RefreshJobWithCooldown> {
    const job = await this.repository.findById(jobId, guildId);
    if (!job) {
      throw new NotFoundException({ message: ErrorKey.REFRESH_JOB_NOT_FOUND });
    }
    return this.withCooldown(job);
  }

  private withCooldown(
    job: NonNullable<
      Awaited<ReturnType<MemberRefreshJobRepository["findById"]>>
    >,
  ): RefreshJobWithCooldown {
    return {
      ...job,
      nextAvailableAt: new Date(
        job.createdAt.getTime() +
          getAdminBulkRefreshRateLimit(this.environment),
      ),
    };
  }
}
