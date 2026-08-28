import { createFileRoute } from "@tanstack/react-router";
import { PolicyLayout } from "@/src/components/policy-layout";
import TermsOfServiceContent from "@/src/content/terms-of-service.mdx";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Lootlog.pl - Regulamin Serwisu" },
      {
        name: "description",
        content: "Szczegóły dotyczące regulaminu serwisu Lootlog.pl",
      },
    ],
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
