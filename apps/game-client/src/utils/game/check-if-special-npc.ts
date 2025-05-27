import { NpcTpl } from "@/types/margonem/npc-tpl-manager";

export const checkIfSpecialNpc = (template: NpcTpl) => {
  return template.type === 5;
};
