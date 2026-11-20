import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout } from "@/components/policy-layout";
import PrivacyPolicyContent from "@/content/privacy-policy.mdx";

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
    links: [
      {
        rel: "canonical",
        href: "https://lootlog.pl/privacy-policy",
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
