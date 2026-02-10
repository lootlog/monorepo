import type {
  AddonTypeBundle,
  CreateUserAddonPayload,
  UpdateUserAddonPayload,
  UserAddon,
} from "@/features/addons/types";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useSession } from "@/hooks/auth/use-session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const USER_ADDONS_QUERY_KEY = ["user-addons"] as const;

export const useUserAddons = () => {
  const { client } = useApiClient();
  const { data: session } = useSession();

  return useQuery({
    queryKey: USER_ADDONS_QUERY_KEY,
    queryFn: async () => {
      const response = await client.get<UserAddon[]>("/users/@me/addons");
      return response.data;
    },
    enabled: !!session?.user,
  });
};

export const useAddonTypeBundle = () => {
  const { client } = useApiClient();
  const { data: session } = useSession();

  return useQuery({
    queryKey: [...USER_ADDONS_QUERY_KEY, "type-bundle"],
    queryFn: async () => {
      const response = await client.get<AddonTypeBundle>(
        "/users/@me/addons/type-bundle",
      );
      return response.data;
    },
    enabled: !!session?.user,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateUserAddon = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["create-user-addon"],
    mutationFn: async (payload: CreateUserAddonPayload) => {
      const response = await client.post<UserAddon>("/users/@me/addons", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ADDONS_QUERY_KEY });
    },
  });
};

export const useUpdateUserAddon = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-user-addon"],
    mutationFn: async (params: {
      addonId: string;
      payload: UpdateUserAddonPayload;
    }) => {
      const response = await client.patch<UserAddon>(
        `/users/@me/addons/${params.addonId}`,
        params.payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ADDONS_QUERY_KEY });
    },
  });
};

export const useInstallUserAddon = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["install-user-addon"],
    mutationFn: async (addonId: string) => {
      const response = await client.post<UserAddon>(
        `/users/@me/addons/${addonId}/install`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ADDONS_QUERY_KEY });
    },
  });
};

export const useUninstallUserAddon = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["uninstall-user-addon"],
    mutationFn: async (addonId: string) => {
      const response = await client.post<UserAddon>(
        `/users/@me/addons/${addonId}/uninstall`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ADDONS_QUERY_KEY });
    },
  });
};

export const useDeleteUserAddon = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-user-addon"],
    mutationFn: async (addonId: string) => {
      await client.delete(`/users/@me/addons/${addonId}`);
      return addonId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ADDONS_QUERY_KEY });
    },
  });
};
