export class BotPermissionsStatusDto {
  ok: boolean;
  missingPermissions: string[];
  checkedAt: string;
  cacheTtlSeconds: number;
  source: 'CACHE' | 'LIVE';
}
