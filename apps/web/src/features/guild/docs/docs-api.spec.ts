import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  getDocsControllerGetDocumentQueryKey,
  getDocsControllerGetDocumentsQueryKey,
  getDocsControllerGetTrashQueryKey,
} from "@/lib/api/generated/main/docs/docs";
import {
  guildDocDetailQueryOptions,
  guildDocsListQueryOptions,
  guildDocsTrashQueryOptions,
} from "./docs-api";

describe("docs-api", () => {
  it("uses stable query keys for the docs list", () => {
    const options = guildDocsListQueryOptions("guild-1");

    expect(options.queryKey).toEqual(
      getDocsControllerGetDocumentsQueryKey({ guildId: "guild-1" }),
    );
  });

  it("uses stable query keys for doc details", () => {
    const options = guildDocDetailQueryOptions("guild-1", "doc-1");

    expect(options.queryKey).toEqual(
      getDocsControllerGetDocumentQueryKey({
        guildId: "guild-1",
        docId: "doc-1",
      }),
    );
  });

  it("uses stable query keys for trash", () => {
    const options = guildDocsTrashQueryOptions("guild-1");

    expect(options.queryKey).toEqual(
      getDocsControllerGetTrashQueryKey({ guildId: "guild-1" }),
    );
  });

  it("keeps list query data under the generated key", () => {
    const queryClient = new QueryClient();
    const queryKey = guildDocsListQueryOptions("guild-1").queryKey;

    queryClient.setQueryData(queryKey, {
      items: [],
      limit: { used: 0, max: 50, trashed: 0, canCreate: true },
    });

    expect(
      queryClient.getQueryData(
        getDocsControllerGetDocumentsQueryKey({ guildId: "guild-1" }),
      ),
    ).toEqual({
      items: [],
      limit: { used: 0, max: 50, trashed: 0, canCreate: true },
    });
  });
});
