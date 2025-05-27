import { useGlobalContext } from "@/contexts/global-context";

export const getLootCreator = () => {
  const { newInterface } = useGlobalContext();
  const { id, lvl, account, prof, img, nick } = newInterface ? window.Engine.hero.d : window.hero.d;

  return {
    id,
    lvl,
    account,
    prof,
    img,
    nick,
  };
};
