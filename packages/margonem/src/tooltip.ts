export type CharacterTip = [content: string, type?: string, options?: unknown];

export type CharacterTooltipOwner = {
  tip?: CharacterTip;
  createStrTip?: (...args: unknown[]) => string;
  updateTip?: () => void;
  tipUpdate?: () => void;
};
