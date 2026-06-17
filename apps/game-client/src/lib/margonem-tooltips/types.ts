import type { Hero } from "@lootlog/margonem/hero";
import type { Other } from "@lootlog/margonem/others";
import type { CharacterTooltipOwner } from "@lootlog/margonem/tooltip";

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
