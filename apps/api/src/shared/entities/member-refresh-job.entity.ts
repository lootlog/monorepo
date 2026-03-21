import { Exclude, Expose } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import { RefreshJobStatus } from "prisma/generated/client";

export class MemberRefreshJobEntity {
  @Expose()
  @ApiProperty({ example: 1, description: "Job ID" })
  id: number;

  @Expose()
  @ApiProperty({ example: "guild_id_123", description: "Guild ID" })
  guildId: string;

  @Expose()
  @ApiProperty({
    example: "PROCESSING",
    enum: RefreshJobStatus,
    description: "Job status",
  })
  status: RefreshJobStatus;

  @Expose()
  @ApiProperty({ example: 100, description: "Total members to refresh" })
  totalMembers: number;

  @Expose()
  @ApiProperty({ example: 45, description: "Members processed so far" })
  processedMembers: number;

  @Expose()
  @ApiProperty({ example: 2, description: "Members that failed to refresh" })
  failedMembers: number;

  @Expose()
  @ApiProperty({
    example: "2025-10-13T12:00:00Z",
    description: "Job creation timestamp",
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    example: "2025-10-13T12:30:00Z",
    description: "Job completion timestamp",
    required: false,
  })
  completedAt?: Date;

  @Exclude()
  requestedBy: string;

  @Exclude()
  updatedAt: Date;
}
