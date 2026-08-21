import type { Metadata } from "next";
import type { JSX } from "react";
import { PolicyLayout } from "@/src/components/policy-layout";
import PrivacyPolicyContent from "@/src/content/privacy-policy.mdx";

export const metadata: Metadata = {
  title: "Lootlog.pl - Polityka Prywatności",
  description:
    "Szczegóły dotyczące przetwarzania danych osobowych w Lootlog.pl",
};

export default function PrivacyPolicy(): JSX.Element {
  return (
    <PolicyLayout lastUpdated="21.08.2026">
      <PrivacyPolicyContent />
    </PolicyLayout>
  );
}
