export interface WraithObjectManager {
  init(): void;
  createWraithObject(data: any): void;
  removeWraithObject(id: any): void;
  checkWraithObject(id: any): boolean;
  getDrawableList(): any[];
  onClear(): void;
  update(dt: number): void;
  [key: string]: any;
}

export interface WraithCharacterManager {
  init(): void;
  addWraith(data: any, id: any): void;
  removeWraith(id: any): void;
  getWraith(id: any): any;
  // Inferred methods could be added here
  [key: string]: any;
}
