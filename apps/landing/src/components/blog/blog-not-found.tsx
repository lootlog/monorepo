import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BlogLayout } from "./blog-layout";

export function BlogNotFound() {
  const { t } = useTranslation();

  return (
    <BlogLayout>
      <div className="landing-container blog-not-found">
        <h1 className="landing-heading-section text-balance">
          {t("landing.blog.notFoundTitle")}
        </h1>
        <p className="landing-lead mt-5 text-[var(--broadcast-text-muted)]">
          {t("landing.blog.notFoundDescription")}
        </p>
        <Link to="/blog" className="landing-action landing-action-solid mt-8">
          {t("landing.blog.back")}
        </Link>
      </div>
    </BlogLayout>
  );
}
