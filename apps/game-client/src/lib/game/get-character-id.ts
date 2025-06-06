export const getCharacterId = (gameInterface: string) => {
  const id = gameInterface === "ni" ? window.Engine.hero.d.id : window.hero.id;
  return id.toString();
};
