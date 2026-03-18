export class RefreshJobUpdateDto {
  jobId: number;
  guildId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalMembers: number;
  processedMembers: number;
  failedMembers: number;
  completedAt?: Date;
}
