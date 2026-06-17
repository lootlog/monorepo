import { cn } from "@lootlog/ui/lib/utils";

export type MemberOnlineSource = "web" | "game";

export const getMemberListItemClassName = ({
  isOnline,
  isActive,
}: {
  isOnline: boolean;
  isActive: boolean;
}) =>
  cn(
    isOnline && "border-emerald-500/50 shadow-emerald-500/10",
    !isActive && "opacity-50",
  );

export const getMemberOnlineSources = ({
  isOnlineOnWeb,
  isOnlineInGame,
}: {
  isOnlineOnWeb: boolean;
  isOnlineInGame: boolean;
}): MemberOnlineSource[] => {
  const sources: MemberOnlineSource[] = [];

  if (isOnlineOnWeb) {
    sources.push("web");
  }

  if (isOnlineInGame) {
    sources.push("game");
  }

  return sources;
};
