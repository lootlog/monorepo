export interface ServerStorage {
  get: (key: string) => Storage;
}

type Storage = {
  [key: string]: [];
};
