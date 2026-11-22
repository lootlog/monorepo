import { MARGONEM_CDN_CHARACTERS_URL } from "@lootlog/domain/margonem-cdn";
import { cn } from "cn";
import type { ComponentProps, FC } from "react";

type CharacterSpriteProps = ComponentProps<"span"> & {
  icon: string;
};

export const CharacterSprite: FC<CharacterSpriteProps> = ({
  icon,
  className,
  style,
  ...props
}) => (
  <span
    data-slot="character-sprite"
    className={cn("ll:block ll:h-12 ll:w-8", className)}
    style={{
      backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${icon})`,
      ...style,
    }}
    {...props}
  />
);
