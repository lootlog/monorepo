import type { ComponentProps } from "react";
import { PageHeader } from "@/components/common/page-header";

export function SettingsHeader(props: ComponentProps<typeof PageHeader>) {
  return <PageHeader {...props} />;
}
