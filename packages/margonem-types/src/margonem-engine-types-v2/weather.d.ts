export interface MapFilter {
  init(): void;
  updateData(data: any, additionalData?: any): void;
  onClear(): void;
  [key: string]: any;
}

export interface Weather {
  // Inferred/Placeholder types for now
  init(): void;
  update(dt: number): void;
  [key: string]: any;
}

export interface EarthQuakeManager {
  // Inferred/Placeholder types for now
  init(): void;
  [key: string]: any;
}
