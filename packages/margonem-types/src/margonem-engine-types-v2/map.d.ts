export interface MapData {
  id: number;
  name: string;
  x: number;
  y: number;
  pvp: number; // 0, 1, 2?
  [key: string]: any;
}

export interface Map {
  d: MapData;
  water: any[]; // likely number[] or Uint8Array
  offset: number[]; // [x, y]
  
  init(): void;
  centerOn(x: number, y: number): void;
  setDirFromMousePosition(): void;
  
  col: {
    check(x: number, y: number): boolean;
    [key: string]: any;
  };
  
  gateways: {
    getOpenGtwAtPosition(x: number, y: number): any;
    [key: string]: any;
  };
  
  goMark: {
    time: number;
    x: number;
    y: number;
  };
  
  [key: string]: any;
}
