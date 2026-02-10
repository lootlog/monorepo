import { AddonEditorPage } from "@/features/addons/addon-editor-page";
import { isDevMode } from "@/lib/utils/is-dev-mode";
import { Navigate, createFileRoute, useParams } from "@tanstack/react-router";

const AddonEditorRoute = () => {
  const { id } = useParams({ from: "/_authenticated/@me/addons_/$id" });

  if (!isDevMode) {
    return <Navigate to="/@me" />;
  }

  return <AddonEditorPage addonId={id} />;
};

export const Route = createFileRoute("/_authenticated/@me/addons_/$id")({
  component: AddonEditorRoute,
});
