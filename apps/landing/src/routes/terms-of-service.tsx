import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout } from "@/components/policy-layout";
import { landingPageHead } from "@/config/page-head";
import TermsOfServiceContent from "@/content/terms-of-service.mdx";

export const Route = createFileRoute("/terms-of-service")({
  head: () =>
    landingPageHead({
      path: "/terms-of-service",
      title: "Lootlog.pl - Regulamin Serwisu",
      description: "Regulamin serwisu Lootlog.pl.",
    }),
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <PolicyLayout lastUpdated="21.08.2026">
      <TermsOfServiceContent />
    </PolicyLayout>
  );
}
