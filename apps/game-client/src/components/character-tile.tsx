import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { MargonemCharacter } from "@/hooks/api/use-character-list";
import { FC, useEffect } from "react";

export type CharacterTileProps = {
  character: MargonemCharacter;
};

export const CharacterTile: FC<CharacterTileProps> = ({ character }) => {
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
      className={
        "ll-w-[32px] ll-h-[48px] ll-relative ll-cursor-pointer ll-rounded-lg"
      }
      style={{
        backgroundImage: `url(${MARGONEM_CDN_CHARACTERS_URL}${character.icon})`,
      }}
    />
  );
};
