import { getMemberDiscordSyncPresentation } from "@/features/guild/settings/members/member-discord-sync.utils";
import type { GuildMember } from "@/features/guild/settings/members/members.types";
import { cn } from "cn";
import { Badge, type BadgeProps } from "@lootlog/ui/components/badge";
import {
  AlertTriangle,
  Clock3,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type MemberStatusCopy = {
  label: string;
  variant: BadgeProps["variant"];
  className?: string;
  icon: LucideIcon;
};

export const MemberStatusBadge = ({ member }: { member: GuildMember }) => {
  const { t } = useTranslation();
  const syncPresentation = getMemberDiscordSyncPresentation(member);

  let copy: MemberStatusCopy = {
    label: t("settings.members.statusAccessOk"),
    variant: "ready",
    icon: ShieldCheck,
  };

  if (!member.active) {
    copy = {
      label: t("settings.members.statusInactive"),
      variant: "outline",
      className: "bg-background text-muted-foreground",
      icon: UserMinus,
    };
  } else if (member.roles.length === 0) {
    copy = {
      label: t("settings.members.statusNoRoles"),
      variant: "timer",
      icon: ShieldAlert,
    };
  } else if (member.isStale) {
    copy = {
      label: t("settings.members.statusSyncStale"),
      variant: "timer",
      icon: Clock3,
    };
  } else if (
    syncPresentation.showListIndicator ||
    syncPresentation.tone !== "success"
  ) {
    copy = {
      label: t("settings.members.statusProblem"),
      variant: "timer",
      icon: AlertTriangle,
    };
  }

  const Icon = copy.icon;

  return (
    <Badge
      variant={copy.variant}
      className={cn("h-6 gap-1.5 px-2 text-[11px]", copy.className)}
    >
      <Icon className="size-3" />
      {copy.label}
    </Badge>
  );
};
