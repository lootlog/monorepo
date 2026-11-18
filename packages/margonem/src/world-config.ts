export type WorldConfig = {
  getWorldName: () => string;
  /**
   * The world's respawn speed: NPCs return this many times faster than their
   * base time. The legacy interface throws until the first packet arrives,
   * and the new one reports 0.
   */
  getNpcResp: () => number;
};
