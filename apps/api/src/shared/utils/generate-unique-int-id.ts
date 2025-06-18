export const generateUniqueIntId = (): number => {
  const base = Date.now() % 1_000_000_000;
  const rand = Math.floor(Math.random() * 1_000_000);
  return (base + rand) % 2_147_483_647;
};
