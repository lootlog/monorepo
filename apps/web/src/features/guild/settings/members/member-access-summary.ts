import type { BadgeProps } from "@lootlog/ui/components/badge";
import type { TFunction } from "i18next";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import type { MemberAccessState } from "./member-list-item.utils";

type MemberAccessSummary = {
  label: string;
  description: string;
  icon: LucideIcon;
  variant: BadgeProps["variant"];
  className?: string;
};

/** How a member's access reads: a badge and the sentence that explains it. */
export const getMemberAccessSummary = (
  accessState: MemberAccessState,
  t: TFunction,
): MemberAccessSummary =>
  (
    {
      active: {
        label: t("settings.members.access.ok"),
        description: t("settings.members.access.okDescription"),
        icon: ShieldCheck,
        variant: "ready",
      },
      inactive: {
        label: t("settings.members.access.inactive"),
        description: t("settings.members.access.inactiveDescription"),
        icon: UserMinus,
        variant: "outline",
        className: "bg-background text-muted-foreground",
      },
      online: {
        label: t("settings.members.access.ok"),
        description: t("settings.members.access.onlineDescription"),
        icon: CheckCircle2,
        variant: "ready",
      },
      problem: {
        label: t("settings.members.access.problem"),
        description: t("settings.members.access.problemDescription"),
        icon: AlertTriangle,
        variant: "timer",
      },
    } satisfies Record<MemberAccessState, MemberAccessSummary>
  )[accessState];
