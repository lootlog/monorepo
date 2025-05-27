export class JoinDto {
  guildIds: string[];
  source: 'game' | 'browser';
  name?: string;
}
