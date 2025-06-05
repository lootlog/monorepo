import { useGlobalStore } from "@/store/global.store";

export const getLootCreator = () => {
  const { gameInterface } = useGlobalStore((state) => state.gameState);
  const { id, lvl, account, prof, img, nick } =
    gameInterface === "ni" ? window.Engine.hero.d : window.hero.d;

  return {
    id,
    lvl,
    account,
    prof,
    img,
    nick,
  };
};
