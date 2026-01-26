export interface TimeOfDayMultiplier {
  from: string;
  to: string;
  multiplier: number;
}

export type TrackersMultipliers = Record<string, number>;

export type MapsCountMultipliers = Record<string, number>;

export type TrackingDurationMultipliers = Record<string, number>;
