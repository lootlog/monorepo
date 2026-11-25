import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout } from "@/components/policy-layout";
import { landingPageHead } from "@/config/page-head";
import PrivacyPolicyContent from "@/content/privacy-policy.mdx";

export const Route = createFileRoute("/privacy-policy")({
  head: () =>
    landingPageHead({
      path: "/privacy-policy",
      title: "Lootlog.pl - Polityka Prywatności",
      description: "Jak Lootlog przetwarza dane osobowe.",
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
