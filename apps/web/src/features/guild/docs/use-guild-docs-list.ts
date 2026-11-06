import { useState } from "react";

import {
  useDocsControllerGetDocuments,
  type GuildDocumentListResponseDtoItemsItem,
} from "@lootlog/client/main";

import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useTranslation } from "react-i18next";
import { guildDocsListQueryOptions } from "./docs-api";
import { canManageGuildDocs, canWriteGuildDocs } from "./docs-permissions";
import { useGuildDocTrash } from "./use-guild-doc-trash";

const filterGuildDocuments = (
  documents: GuildDocumentListResponseDtoItemsItem[],
  searchValue: string,
) => {
  const normalizedSearch = searchValue.trim().toLocaleLowerCase("pl");

  if (!normalizedSearch) return documents;

  return documents.filter((document) =>
    document.title.toLocaleLowerCase("pl").includes(normalizedSearch),
  );
};

export const useGuildDocsList = () => {
  const { t } = useTranslation();
  const guildId = useGuildId() ?? "";
  const { data: accessPolicy } = useGuildPermissions();
  const [searchValue, setSearchValue] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const [documentPendingTrash, setDocumentPendingTrash] =
    useState<GuildDocumentListResponseDtoItemsItem | null>(null);

  const documentsQuery = useDocsControllerGetDocuments(
    { guildId },
    {
      query: guildDocsListQueryOptions(guildId),
    },
  );

  const { confirmBeforeTrash, deleteDocument, moveToTrash } =
    useGuildDocTrash();

  const documents = documentsQuery.data?.items ?? [];
  const filteredDocuments = filterGuildDocuments(documents, searchValue);

  const limit = documentsQuery.data?.limit ?? {
    canCreate: false,
    max: 50,
    trashed: 0,
    used: documents.length,
  };

  const canCreate = canWriteGuildDocs(accessPolicy) && limit.canCreate;
  const canWrite = canWriteGuildDocs(accessPolicy);
  const canManage = canManageGuildDocs(accessPolicy);
  const hasDocuments = documents.length > 0;
  const hasFilteredDocuments = filteredDocuments.length > 0;

  const moveDocumentToTrash = async (
    document: GuildDocumentListResponseDtoItemsItem,
  ) => {
    if (await moveToTrash(document.id)) setDocumentPendingTrash(null);
  };

  const requestTrash = (document: GuildDocumentListResponseDtoItemsItem) => {
    if (confirmBeforeTrash) setDocumentPendingTrash(document);
    else void moveDocumentToTrash(document);
  };

  return {
    t,
    searchValue,
    setSearchValue,
    documentsQuery,
    limit,
    canWrite,
    setTrashOpen,
    canCreate,
    setCreateOpen,
    hasDocuments,
    hasFilteredDocuments,
    filteredDocuments,
    guildId,
    deleteDocument,
    setDocumentPendingTrash,
    createOpen,
    canManage,
    trashOpen,
    documentPendingTrash,
    moveDocumentToTrash,
    requestTrash,
  };
};
