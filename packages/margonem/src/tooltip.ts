type CharacterTip = [content: string, type?: string, options?: unknown];

export type CharacterTooltipOwner = {
  tip?: CharacterTip;
  updateTip?: () => void;
  tipUpdate?: () => void;
};

export type CharacterTipUpdate = {
  text: string;
  object?: unknown;
};
