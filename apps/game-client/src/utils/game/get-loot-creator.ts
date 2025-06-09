import { Game } from "@/lib/game";

export const getLootCreator = () => {
  const { id, lvl, account, prof, img, nick } = Game.hero;

  return {
    id,
    lvl,
    account,
    prof,
    img,
    nick,
  };
};
