import { Link } from "@tanstack/react-router";
import { CompassIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { PageState } from "@lootlog/ui/components/page-state";
import { SiteLayout } from "@/components/site-layout";

export function SiteNotFound() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <div className="landing-container blog-not-found">
        <PageState
          icon={<CompassIcon />}
          title={t("landing.notFound.title")}
          description={t("landing.notFound.description")}
        >
          <Button nativeButton={false} render={<Link to="/" />}>
            {t("landing.notFound.home")}
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/blog" />}
          >
            {t("landing.notFound.blog")}
          </Button>
        </PageState>
      </div>
    </SiteLayout>
  );
}
