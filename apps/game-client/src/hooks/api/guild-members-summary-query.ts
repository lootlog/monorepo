import type { UseQueryOptions } from "@tanstack/react-query";
import {
  getMembersControllerGetGuildMembersSummaryQueryKey,
  getMembersControllerGetGuildMembersSummaryQueryOptions as getGeneratedGuildMembersSummaryQueryOptions,
  type MembersControllerGetGuildMembersSummaryQueryError,
  type MembersControllerGetGuildMembersSummaryQueryResult,
  useMembersControllerGetGuildMembersSummary,
} from "@/lib/api/generated/main/members/members";
import type { MembersControllerGetGuildMembersSummaryPathParameters } from "@/lib/api/generated/main/model";

export const GUILD_MEMBERS_SUMMARY_STALE_TIME = 5 * 60 * 1000;

type GuildMembersSummaryQuery<
  TData = MembersControllerGetGuildMembersSummaryQueryResult,
  TError = MembersControllerGetGuildMembersSummaryQueryError,
> = Omit<
  UseQueryOptions<
    MembersControllerGetGuildMembersSummaryQueryResult,
    TError,
    TData
  >,
  "queryFn" | "queryKey"
>;

type GuildMembersSummaryQueryOptions<
  TData = MembersControllerGetGuildMembersSummaryQueryResult,
  TError = MembersControllerGetGuildMembersSummaryQueryError,
> = {
  query?: GuildMembersSummaryQuery<TData, TError>;
  request?: RequestInit;
};

export const getGuildMembersSummaryQueryKey =
  getMembersControllerGetGuildMembersSummaryQueryKey;

export const getGuildMembersSummaryQueryOptions = <
  TData = MembersControllerGetGuildMembersSummaryQueryResult,
  TError = MembersControllerGetGuildMembersSummaryQueryError,
>(
  pathParameters: MembersControllerGetGuildMembersSummaryPathParameters,
  options?: GuildMembersSummaryQueryOptions<TData, TError>,
) => {
  return getGeneratedGuildMembersSummaryQueryOptions(pathParameters, {
    ...options,
    query: {
      gcTime: Infinity,
      staleTime: GUILD_MEMBERS_SUMMARY_STALE_TIME,
      ...options?.query,
    } as UseQueryOptions<
      MembersControllerGetGuildMembersSummaryQueryResult,
      TError,
      TData
    >,
  });
};

export const useGuildMembersSummary = <
  TData = MembersControllerGetGuildMembersSummaryQueryResult,
  TError = MembersControllerGetGuildMembersSummaryQueryError,
>(
  pathParameters: MembersControllerGetGuildMembersSummaryPathParameters,
  options?: GuildMembersSummaryQueryOptions<TData, TError>,
) => {
  return useMembersControllerGetGuildMembersSummary(pathParameters, {
    ...options,
    query: {
      gcTime: Infinity,
      staleTime: GUILD_MEMBERS_SUMMARY_STALE_TIME,
      ...options?.query,
    } as UseQueryOptions<
      MembersControllerGetGuildMembersSummaryQueryResult,
      TError,
      TData
    >,
  });
};
