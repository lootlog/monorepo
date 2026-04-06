export interface ServerStorage {
  get: (key: string) => Storage;
}

export type Storage = {
  [key: string]: [];
};
