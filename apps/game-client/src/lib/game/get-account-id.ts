export const getAccountId = (gameInterface: string) => {
  return gameInterface === "ni"
    ? window.Engine.hero.d.account
    : window.hero.account;
};
