import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BlogGuideCard } from "@/src/components/blog/blog-guide-card";
import { SectionHead } from "@/src/components/landing/section-head";
import { blogPosts } from "@/src/config/blog";

export function GuidesShowcase() {
  const { t } = useTranslation();

  return (
    <section
      id="guides"
      aria-labelledby="guides-title"
      className="landing-section bg-[var(--broadcast-ink)] text-[var(--broadcast-white)]"
    >
      <div className="landing-container">
        <SectionHead
          id="guides-title"
          title={t("landing.guides.title")}
          description={t("landing.guides.description")}
        >
          <Link to="/blog" className="landing-footer-link mt-3">
            {t("landing.blog.back")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </SectionHead>
        <ul className="blog-index mt-12 sm:mt-16">
          {blogPosts.map((post) => (
            <li key={post.slug}>
              <BlogGuideCard post={post} heading="h3" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
