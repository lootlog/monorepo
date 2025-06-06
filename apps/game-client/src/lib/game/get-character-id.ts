export const getCharacterId = (gameInterface: string) => {
  return gameInterface === "ni" ? window.Engine.hero.d.id : window.hero.id;
};
