import type { CharacterTooltipOwner, Hero, Other } from "@lootlog/margonem";

export type CharacterTooltipKind = "hero" | "other";

export type MargonemTooltipCharacter = Hero | Other | CharacterTooltipOwner;

export type CharacterTooltipTransformContext = {
  kind: CharacterTooltipKind;
  character: MargonemTooltipCharacter;
  baseHtml: string;
  currentHtml: string;
};

export type CharacterTooltipTransform = (
  context: CharacterTooltipTransformContext,
) => string | null | undefined | void;
