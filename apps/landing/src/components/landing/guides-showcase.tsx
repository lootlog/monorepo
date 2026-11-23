import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BlogGuideCard } from "@/components/blog/blog-guide-card";
import { SectionHead } from "@/components/landing/section-head";
import { blogPosts } from "@/config/blog";
import { TextLink } from "@lootlog/ui/components/text-link";

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
          <TextLink
            render={<Link to="/blog" />}
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm"
          >
            {t("landing.blog.back")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </TextLink>
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
