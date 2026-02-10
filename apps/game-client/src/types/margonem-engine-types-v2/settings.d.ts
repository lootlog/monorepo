export interface SettingsStorage {
  init(): void;
  get(key: string): any;
  set(key: string, value: any): void;
  [key: string]: any;
}
