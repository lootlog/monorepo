import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout } from "@/components/policy-layout";
import PrivacyPolicyContent from "@/content/privacy-policy.mdx";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Lootlog.pl - Polityka Prywatności" },
      {
        name: "description",
        content: "Jak Lootlog przetwarza dane osobowe.",
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
