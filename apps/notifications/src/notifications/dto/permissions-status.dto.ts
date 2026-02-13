export class PermissionsStatusDto {
  ok: boolean;
  missingPermissions: string[];
  checkedAt: string;
  cacheTtlSeconds: number;
  reason?: string;
}
