const MINE_DIALOG_NPC_LEVELS: Readonly<Record<string, number>> = {
  "Pokaźne Złoże": 43,
  "Large Deposit": 43,
  "Naładowany kryształ": 64,
  "Charged Crystal": 64,
  "Błękitne złoże": 83,
  "Azure Vein": 83,
  "Niewydobyty minerał": 114,
  "Unmined Mineral": 114,
  "Zamrożony czarodziej": 300,
  "Frozen Wizard": 300,
};

type ResolveDialogLootNpcLevelOptions = {
  npcName: string;
  npcLevel: number;
};

export const resolveDialogLootNpcLevel = ({
  npcName,
  npcLevel,
}: ResolveDialogLootNpcLevelOptions): number => {
  if (npcLevel !== 0) return npcLevel;

  return MINE_DIALOG_NPC_LEVELS[npcName] ?? npcLevel;
};
