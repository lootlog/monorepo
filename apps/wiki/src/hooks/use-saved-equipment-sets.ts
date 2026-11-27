import { useQueryClient } from "@tanstack/react-query";
import {
  getUserEquipmentSetsControllerGetSetsQueryKey,
  getUsersControllerGetUserLimitsQueryKey,
  useUserEquipmentSetsControllerCreateSet,
  useUserEquipmentSetsControllerDeleteSet,
  useUserEquipmentSetsControllerGetSets,
  useUserEquipmentSetsControllerUpdateSet,
  useUsersControllerGetUserLimits,
} from "@lootlog/client/main";

export const useSavedEquipmentSets = () => {
  const sets = useUserEquipmentSetsControllerGetSets({
    query: { queryKey: getUserEquipmentSetsControllerGetSetsQueryKey() },
  });

  const limits = useUsersControllerGetUserLimits({
    query: { queryKey: getUsersControllerGetUserLimitsQueryKey() },
  });

  return {
    sets: sets.data ?? [],
    isPending: sets.isPending,
    hasError: sets.isError,
    limit: limits.data?.equipmentSets,
  };
};

export const useSavedEquipmentSetMutations = () => {
  const queryClient = useQueryClient();

  const mutation = {
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: getUserEquipmentSetsControllerGetSetsQueryKey(),
      }),
  };

  return {
    create: useUserEquipmentSetsControllerCreateSet({ mutation }),
    update: useUserEquipmentSetsControllerUpdateSet({ mutation }),
    remove: useUserEquipmentSetsControllerDeleteSet({ mutation }),
  };
};
