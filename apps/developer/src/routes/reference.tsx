import { createFileRoute } from "@tanstack/react-router";
import { ApiReference } from "@/components/api-reference";
import { ApiReferenceSkeleton } from "@/components/api-reference-skeleton";
import { pageHead } from "@/lib/seo";
import { portalText as t } from "@/lib/translations";

export const Route = createFileRoute("/reference")({
  ssr: false,
  head: () =>
    pageHead({
      path: "/reference",
      title: t.reference,
      description: t.referenceDescription,
    }),
  component: ApiReference,
  pendingComponent: ApiReferenceSkeleton,
});
