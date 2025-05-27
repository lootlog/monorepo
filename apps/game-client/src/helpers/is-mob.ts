export const isMob = (npc: any) => {
  return (npc.d.type === 3 || npc.d.type === 2) && npc.d.wt > 9;
};
