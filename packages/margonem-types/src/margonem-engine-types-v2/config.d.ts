export interface WorldConfig {
  getDropDestroyLvl(): number;
  getWorldName(): string;
  getDomain(): string;
  [key: string]: any;
}
