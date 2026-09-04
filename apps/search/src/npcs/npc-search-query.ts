export interface NpcSearchQuery {
  readonly ids?: number[];
  readonly limit: number;
  readonly search?: string | string[];
  readonly world?: string;
}
