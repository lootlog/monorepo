export type RefreshJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface RefreshJobUpdate {
  jobId: number;
  guildId: string;
  status: RefreshJobStatus;
  totalMembers: number;
  processedMembers: number;
  failedMembers: number;
  completedAt?: Date;
  refreshedIds?: string[];
  skippedIds?: string[];
  failedIds?: string[];
}
