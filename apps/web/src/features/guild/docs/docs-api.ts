import {
  getDocsControllerGetDocumentQueryKey,
  getDocsControllerGetDocumentQueryOptions,
  getDocsControllerGetDocumentsQueryKey,
  getDocsControllerGetDocumentsQueryOptions,
  getDocsControllerGetTrashQueryKey,
  getDocsControllerGetTrashQueryOptions,
  invalidateDocsControllerGetDocument,
  invalidateDocsControllerGetDocuments,
  invalidateDocsControllerGetTrash,
} from "@lootlog/client/main";
import type { QueryClient } from "@tanstack/react-query";

export const guildDocsListQueryOptions = (guildId: string) =>
  getDocsControllerGetDocumentsQueryOptions(
    { guildId },
    {
      query: {
        queryKey: getDocsControllerGetDocumentsQueryKey({ guildId }),
        staleTime: 30_000,
      },
    },
  );

export const guildDocDetailQueryOptions = (guildId: string, docId: string) =>
  getDocsControllerGetDocumentQueryOptions(
    { guildId, docId },
    {
      query: {
        queryKey: getDocsControllerGetDocumentQueryKey({ guildId, docId }),
        staleTime: 30_000,
      },
    },
  );

export const guildDocsTrashQueryOptions = (guildId: string) =>
  getDocsControllerGetTrashQueryOptions(
    { guildId },
    {
      query: {
        queryKey: getDocsControllerGetTrashQueryKey({ guildId }),
        staleTime: 30_000,
      },
    },
  );

export const invalidateGuildDocsQueries = async (
  queryClient: QueryClient,
  guildId: string,
  docId?: string,
) => {
  await Promise.all([
    invalidateDocsControllerGetDocuments(queryClient, { guildId }),
    invalidateDocsControllerGetTrash(queryClient, { guildId }),
    docId &&
      invalidateDocsControllerGetDocument(queryClient, { guildId, docId }),
  ]);
};
