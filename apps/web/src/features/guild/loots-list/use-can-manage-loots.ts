import { Capability } from "@lootlog/schema/permissions";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useIsOwner } from "@/hooks/context/use-is-owner";

export const useCanManageLoots = () => {
  const { data: accessPolicy } = useGuildPermissions();
  const isOwner = useIsOwner();

  return Boolean(
    accessPolicy?.allows(Capability.LOOTLOG_LOOTS_ARCHIVE) || isOwner,
  );
};
