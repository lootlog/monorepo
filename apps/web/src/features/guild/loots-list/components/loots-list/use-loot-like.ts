import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  lootsControllerLikeLoot,
  lootsControllerUnlikeLoot,
} from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/components/sonner";
import { useIsViewer } from "@/hooks/auth/use-is-viewer";
import { useSession } from "@/hooks/auth/use-session";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { patchLoot } from "@/features/guild/loots-list/components/loots-list/loot-list-cache";
import type { Loot } from "@/lib/loots/loot-types";

// Requests for one loot still in flight, shared by its list tile and dialog.
const pendingRequests = new Map<string, number>();

const track = (key: string, change: 1 | -1) => {
  const pending = (pendingRequests.get(key) ?? 0) + change;

  if (pending === 0) pendingRequests.delete(key);
  else pendingRequests.set(key, pending);

  return pending;
};

/**
 * Likes and unlikes a loot as the viewer. The heart flips at once; requests
 * for one loot run in order, and only the last one to settle replaces the
 * optimistic likes with the server's.
 */
export const useLootLike = (loot: Loot) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const isViewer = useIsViewer();
  const { data: session } = useSession();
  const key = `${guildId}:${loot.id}`;

  const { mutate } = useMutation({
    scope: { id: `loot-like:${key}` },
    mutationFn: ({ like }: { like: boolean; previous: Loot["likes"] }) => {
      const request = like
        ? lootsControllerLikeLoot
        : lootsControllerUnlikeLoot;

      return request({ guildId: guildId ?? "", lootId: loot.id });
    },
    onSuccess: (response) => {
      if (guildId && track(key, -1) === 0)
        patchLoot(queryClient, guildId, loot.id, {
          likes: [...response.likes],
        });
    },
    onError: (_error, { previous }) => {
      if (guildId && track(key, -1) === 0)
        patchLoot(queryClient, guildId, loot.id, { likes: previous });

      toast.error(t("loots.list.likeError"));
    },
  });

  const liked = loot.likes.some((member) => isViewer(member.userId));
  const viewer = session?.user;

  const toggle = () => {
    if (!guildId || !viewer) return;

    const previous = loot.likes;

    // The viewer's Member id is unknown until the server answers.
    const likes = liked
      ? previous.filter((member) => !isViewer(member.userId))
      : [
          ...previous,
          {
            id: 0,
            name: viewer.name,
            avatar: viewer.image ?? null,
            userId: viewer.discordId,
          },
        ];

    track(key, 1);
    patchLoot(queryClient, guildId, loot.id, { likes });
    mutate({ like: !liked, previous });
  };

  return { liked, likes: loot.likes, toggle };
};
