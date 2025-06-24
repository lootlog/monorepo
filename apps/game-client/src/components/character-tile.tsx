import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { MargonemCharacter } from "@/hooks/api/use-character-list";
import { cn } from "@/lib/utils";
import { FC, useEffect } from "react";

export type CharacterTileProps = {
  character: MargonemCharacter;
  className?: string;
};

export const CharacterTile: FC<CharacterTileProps> = ({
  character,
  className,
}) => {
  useEffect(() => {
    // @ts-ignore
    $(`#${character.id}`).tip(`
          <span class="elite_timer_tip_name">
          ${character.nick} (${character.lvl}${character.prof})
          </span>
        `);
  }, []);

  return (
    <div
      id={character.id.toString()}
      className={cn(
        "ll-w-[32px] ll-h-[48px] ll-relative ll-custom-cursor-pointer ll-rounded-lg",
        className
      )}
      style={{
        backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${character.icon})`,
      }}
    />
  );
};
