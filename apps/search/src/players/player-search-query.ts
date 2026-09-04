export interface PlayerSearchQuery {
  readonly limit: number;
  readonly search?: string | string[];
  readonly world?: string;
}
