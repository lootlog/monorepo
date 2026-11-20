import { createFileRoute } from "@tanstack/react-router";
import { WhatsNew } from "@/features/whats-new/whats-new";

export const Route = createFileRoute("/_authenticated/@me/whats-new")({
  staticData: {
    navigation: ({ t }) => ({ label: t("layout.whatsNew.title") }),
  },
  component: WhatsNew,
});
