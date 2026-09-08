/** IframeWindowManager.ts builds the profile URL from these options. */
export interface PlayerProfileOptions {
  staticUrl?: string | false;
  accountId?: string | number;
  characterId?: string | number;
  worldName?: string;
  contentClass?: string;
  closeCallback?: () => void;
  wndData?: unknown;
}

export type iframeWindowManager = {
  newPlayerProfile: (data?: PlayerProfileOptions) => void;
};
