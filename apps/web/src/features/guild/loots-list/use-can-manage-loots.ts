import { Capability } from "@lootlog/domain/access-policy";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useIsOwner } from "@/hooks/context/use-is-owner";

/** Whether the member manages the Organization's loots: archives them and voids draws. */
export const useCanManageLoots = () => {
  const { data: accessPolicy } = useGuildPermissions();
  const isOwner = useIsOwner();

  return Boolean(
    accessPolicy?.allows(Capability.LOOTLOG_LOOTS_ARCHIVE) || isOwner,
  );
};
