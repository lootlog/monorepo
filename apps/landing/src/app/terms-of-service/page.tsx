import type { Metadata } from "next/dist/lib/metadata/types/metadata-interface";
import type { JSX } from "react";
import { PolicyLayout } from "@/src/components/policy-layout";
import TermsOfServiceContent from "@/src/content/terms-of-service.mdx";

export const metadata: Metadata = {
  title: "Lootlog.pl - Regulamin Serwisu",
  description: "Szczegóły dotyczące regulaminu serwisu Lootlog.pl",
};

export default function TermsOfService(): JSX.Element {
  return (
    <PolicyLayout lastUpdated={new Date().toLocaleDateString("pl-PL")}>
      <TermsOfServiceContent />
    </PolicyLayout>
  );
}
