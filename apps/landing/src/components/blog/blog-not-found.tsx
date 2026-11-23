import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { PageState } from "@lootlog/ui/components/page-state";
import { SiteLayout } from "@/components/site-layout";

export function BlogNotFound() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <div className="landing-container blog-not-found">
        <PageState
          icon={<BookOpen />}
          title={t("landing.blog.notFoundTitle")}
          description={t("landing.blog.notFoundDescription")}
        >
          <Button nativeButton={false} render={<Link to="/blog" />}>
            <ArrowLeft />
            {t("landing.blog.back")}
          </Button>
        </PageState>
      </div>
    </SiteLayout>
  );
}
