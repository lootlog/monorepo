import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BlogLayout } from "../components/blog/blog-layout";
import { BlogGuideCard } from "../components/blog/blog-guide-card";
import { blogPageHead, blogPosts } from "../config/blog";
import translations from "../i18n/translations/landing.json";

export const Route = createFileRoute("/blog/")({
  head: () =>
    blogPageHead({
      title: translations.blog.title,
      description: translations.blog.description,
      path: "/blog",
    }),
  component: BlogIndex,
});

function BlogIndex() {
  const { t } = useTranslation();

  return (
    <BlogLayout>
      <div className="landing-container">
        <header className="blog-index-header">
          <h1 className="landing-heading-display text-balance">
            {t("landing.blog.title")}
          </h1>
          <p className="landing-lead text-[var(--broadcast-text-muted)]">
            {t("landing.blog.intro")}
          </p>
        </header>
        <ul className="blog-index">
          {blogPosts.map((post) => (
            <li key={post.slug}>
              <BlogGuideCard post={post} />
            </li>
          ))}
        </ul>
      </div>
    </BlogLayout>
  );
}
