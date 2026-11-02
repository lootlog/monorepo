export type NpcTpl = {
  id: number;
  level?: number;
  nick: string;
  prof: string;
  type: number;
  warrior_type?: number;
  resp_rand: number;
  elasticLevelFactor?: number;
  /** Present on the template of a hero spawned by an event. */
  isHeroFromEvent?: boolean;
};
