import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BlogLayout } from "./blog-layout";

export function BlogNotFound() {
  const { t } = useTranslation();

  return (
    <BlogLayout>
      <h1 className="blog-title">{t("landing.blog.notFoundTitle")}</h1>
      <p className="blog-updated">{t("landing.blog.notFoundDescription")}</p>
      <Link to="/blog" className="blog-text-link">
        {t("landing.blog.back")}
      </Link>
    </BlogLayout>
  );
}
