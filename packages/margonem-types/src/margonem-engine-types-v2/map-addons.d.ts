export interface MapShift {
  init(): void;
  setShift(x: number, y: number): void;
  getShift(): number[];
  [key: string]: any;
}

export interface MapGoMark {
  init(): void;
  update(dt: number): void;
  draw(ctx: any): void;
  onClear(): void;
  createMapGoMark(x: number, y: number): void;
  getOrder(): number;
  getAlwaysDraw(): boolean;
  setAlwaysDraw(alwaysDraw: boolean): void;
  [key: string]: any;
}
