import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";

type SectionHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export const SectionHeader = ({ subtitle, ...props }: SectionHeaderProps) => (
  <PageHeader description={subtitle} {...props} />
);
