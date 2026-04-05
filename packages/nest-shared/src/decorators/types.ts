export type RequestLike = {
  [key: string]: unknown;
  params?: Record<string, string | undefined>;
};
