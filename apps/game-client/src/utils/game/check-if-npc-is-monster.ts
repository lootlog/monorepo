import { NpcTpl } from "@/types/margonem/npc-tpl-manager";

export const checkIfAllowedNpc = (template: NpcTpl) => {
  return (
    template.type === 3 ||
    template.type === 2 ||
    template.type === 5 ||
    template.type === 0
  );
};
