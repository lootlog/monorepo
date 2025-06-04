import { useGlobalContext } from "@/contexts/global-context";

export const getLootCreator = () => {
  const { gameInterface } = useGlobalContext();
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
