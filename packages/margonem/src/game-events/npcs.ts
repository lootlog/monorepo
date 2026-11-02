export type Npcs = {
  icon: { id: number };
  id: number;
  tpl: number;
  x: number;
  y: number;
  /**
   * Seconds until Margonem removes the NPC, shown above its head; 0 or absent
   * when it has no countdown. A Hero Tracker gets one once a player claims it.
   */
  killSeconds?: number;
}[];
