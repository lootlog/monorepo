export interface ItemSearchQuery {
  readonly limit: number;
  readonly offset: number;
  readonly search?: string;
  readonly world?: string;
  readonly filter?: string | string[];
  readonly facets?: string[];
  readonly sort?: string[];
}
