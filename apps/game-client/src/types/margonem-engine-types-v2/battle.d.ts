export interface Battle {
  init(): void;
  update(dt: number): void;
  draw(ctx: any): void;
  // Common methods used in battles
  start(data: any): void;
  stop(): void;
  check(): boolean;
  [key: string]: any;
}
