export type CharacterTip = [content: string, type?: string, options?: unknown];

export type CharacterTooltipOwner = {
  tip?: CharacterTip;
  /** Hero rebuilds its cached tip through Hero.createStrTip. */
  updateTip?: () => void;
  /** Other rebuilds its cached tip through Engine.others.createStrTip. */
  tipUpdate?: () => void;
};

/**
 * Hero.createStrTip and OthersManager.createStrTip emit this object through
 * the afterCharacterTipUpdate API event and return its `text` afterwards, so a
 * handler may replace `text`. Party member tips carry no `object`.
 */
export type CharacterTipUpdate = {
  text: string;
  object?: unknown;
};
