export type AsyncResourceState = {
  error: unknown;
  initialLoading: boolean;
  refreshing: boolean;
  retry: () => void;
};
