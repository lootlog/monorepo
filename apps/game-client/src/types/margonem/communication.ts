export type Communication = {
  ogSuccessData: ((event: string) => void) | null;
  successData: (event: string) => void;
};
