import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout } from "@/src/components/policy-layout";
import PrivacyPolicyContent from "@/src/content/privacy-policy.mdx";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Lootlog.pl - Polityka Prywatności" },
      {
        name: "description",
        content:
          "Szczegóły dotyczące przetwarzania danych osobowych w Lootlog.pl",
      },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <PolicyLayout lastUpdated="21.08.2026">
      <PrivacyPolicyContent />
    </PolicyLayout>
  );
}
