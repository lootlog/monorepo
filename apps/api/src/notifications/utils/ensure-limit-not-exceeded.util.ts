import { ConflictException } from "#src/shared/http/http-errors";

export function ensureLimitNotExceeded(params: {
  currentCount: number;
  limit: number;
  errorMessage: string;
  metadata?: Record<string, unknown>;
}) {
  if (params.currentCount >= params.limit) {
    throw new ConflictException({
      message: params.errorMessage,
      ...params.metadata,
    });
  }
}
