import { Alert, AlertDescription } from "@lootlog/ui/components/alert";
import { Button } from "@lootlog/ui/components/button";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { KeyCreateSheet } from "~/components/key-create-sheet";
import { KeyList } from "~/components/key-list";
import { KeySecretCard } from "~/components/key-secret-card";
import { isApiKeyActive } from "~/lib/key-client";
import {
  apiKeysQueryOptions,
  keyOrganizationsQueryOptions,
} from "~/lib/key-queries";
import { portalText as t } from "~/lib/translations";

const ACTIVE_KEY_LIMIT = 10;

export function KeyManager({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const keysQueryOptions = apiKeysQueryOptions(userId);
  const keysQuery = useQuery(keysQueryOptions);
  const organizationsQuery = useQuery(keyOrganizationsQueryOptions(userId));
  const [secret, setSecret] = useState<string | null>(null);
  const createTrigger = useRef<HTMLButtonElement>(null);
  const secretHeading = useRef<HTMLHeadingElement>(null);

  const queries = [keysQuery, organizationsQuery];
  const isLoaded = queries.every((query) => query.data !== undefined);

  const hasLoadFailed =
    !isLoaded &&
    queries.some((query) => query.isError) &&
    queries.every((query) => !query.isFetching);

  let refreshState: "ready" | "loading" | "error" = "ready";

  if (keysQuery.isFetching) refreshState = "loading";
  else if (keysQuery.isError) refreshState = "error";

  const keys = keysQuery.data ?? [];
  const observedAt = keysQuery.dataUpdatedAt;

  const activeKeys = keys.filter((key) =>
    isApiKeyActive(key, observedAt),
  ).length;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: keysQueryOptions.queryKey });

  return (
    <div className="flex flex-col gap-8">
      {secret && (
        <KeySecretCard
          secret={secret}
          headingRef={secretHeading}
          onDismiss={() => {
            setSecret(null);
            requestAnimationFrame(() => createTrigger.current?.focus());
          }}
        />
      )}
      {!isLoaded && !hasLoadFailed && (
        <div role="status" className="flex flex-col gap-4">
          <span className="sr-only">{t.loading}</span>
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      )}
      {hasLoadFailed && (
        <Alert variant="destructive">
          <AlertDescription>{t.error}</AlertDescription>
          <Button
            variant="outline"
            className="mt-3 w-fit"
            onClick={() => {
              for (const query of queries) {
                if (query.isError) void query.refetch();
              }
            }}
          >
            {t.retry}
          </Button>
        </Alert>
      )}
      {isLoaded && (
        <div className="flex min-w-0 flex-col gap-6">
          <KeyCreateSheet
            organizations={organizationsQuery.data ?? []}
            disabled={
              secret !== null ||
              activeKeys >= ACTIVE_KEY_LIMIT ||
              refreshState !== "ready"
            }
            keyLimitReached={activeKeys >= ACTIVE_KEY_LIMIT}
            triggerRef={createTrigger}
            finalFocus={() => secretHeading.current ?? createTrigger.current}
            onCreated={async (createdSecret) => {
              setSecret(createdSecret);
              await refresh();
            }}
          />
          <KeyList
            keys={keys}
            organizations={organizationsQuery.data ?? []}
            observedAt={observedAt}
            refreshState={refreshState}
            onRefresh={refresh}
          />
        </div>
      )}
    </div>
  );
}
