import type { Other } from "@lootlog/margonem/others";

export type CharacterTooltipTransformContext = {
  character: Other;
  baseHtml: string;
  currentHtml: string;
};

export type CharacterTooltipTransform = (
  context: CharacterTooltipTransformContext,
) => string | null | undefined | void;
