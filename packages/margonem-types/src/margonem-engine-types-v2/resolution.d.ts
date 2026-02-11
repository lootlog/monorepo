export interface Resolution {
  init(): void;
  setResolution(resolutionKey: string, clientInit?: boolean): void;
  getResolutionData(): { w: number, h: number };
  getResolutionKey(): string;
  [key: string]: any;
}
