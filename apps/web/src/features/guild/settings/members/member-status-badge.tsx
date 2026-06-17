import { getMemberDiscordSyncPresentation } from "@/features/guild/settings/members/member-discord-sync.utils";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import { cn } from "@/utils/cn";
import { Badge } from "@lootlog/ui/components/badge";
import {
  AlertTriangle,
  Clock3,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export const MemberStatusBadge = ({ member }: { member: GuildMember }) => {
  const { t } = useTranslation();
  const syncPresentation = getMemberDiscordSyncPresentation(member);
  let copy: {
    label: string;
    className: string;
    icon: LucideIcon;
  } = {
    label: t("settings.members.statusAccessOk"),
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-500",
    icon: ShieldCheck,
  };

  if (!member.active) {
    copy = {
      label: t("settings.members.statusInactive"),
      className: "border-border bg-background/50 text-muted-foreground",
      icon: UserMinus,
    };
  } else if (member.roles.length === 0) {
    copy = {
      label: t("settings.members.statusNoRoles"),
      className: "border-amber-500/25 bg-amber-500/10 text-amber-500",
      icon: ShieldAlert,
    };
  } else if (member.isStale) {
    copy = {
      label: t("settings.members.statusSyncStale"),
      className: "border-amber-500/25 bg-amber-500/10 text-amber-500",
      icon: Clock3,
    };
  } else if (
    syncPresentation.showListIndicator ||
    syncPresentation.tone !== "success"
  ) {
    copy = {
      label: t("settings.members.statusProblem"),
      className: "border-amber-500/25 bg-amber-500/10 text-amber-500",
      icon: AlertTriangle,
    };
  }

  const Icon = copy.icon;

  return (
    <Badge
      variant="outline"
      className={cn("h-6 gap-1.5 px-2 text-[11px]", copy.className)}
    >
      <Icon className="size-3" />
      {copy.label}
    </Badge>
  );
};
