export const getAccountId = (gameInterface: string) => {
  const id =
    gameInterface === "ni" ? window.Engine.hero.d.account : window.hero.account;
  return id.toString();
};
