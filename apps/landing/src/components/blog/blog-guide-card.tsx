import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { BlogPost } from "../../config/blog";
import { BlogGuideIcon } from "./blog-guide-icon";

export function BlogGuideCard({
  post,
  heading: Heading = "h2",
}: {
  post: BlogPost;
  heading?: "h2" | "h3";
}) {
  const { t } = useTranslation();

  return (
    <ChevronLink
      className="blog-guide-card focus-visible:ring-0 focus-visible:ring-offset-0"
      data-surface={post.surface}
      data-orientation={
        post.previewHeight > post.previewWidth ? "portrait" : "landscape"
      }
      aria-label={post.title}
      render={<Link to="/blog/$slug" params={{ slug: post.slug }} />}
    >
      <div className="blog-guide-copy">
        <div className="blog-guide-meta">
          <span className="blog-guide-badge">
            <BlogGuideIcon guide={post.key} size={20} strokeWidth={2.25} />
          </span>
          <span className="blog-guide-number">{post.number}</span>
        </div>
        <Heading>{post.title}</Heading>
        <p>{post.description}</p>
        <span className="blog-guide-read">{t("landing.blog.read")}</span>
      </div>
      <div className="blog-guide-preview" aria-hidden="true">
        <span className="landing-shape blog-guide-ring" />
        <span className="landing-shape blog-guide-dot" />
        <img
          src={post.preview}
          width={post.previewWidth}
          height={post.previewHeight}
          alt=""
          loading="lazy"
        />
      </div>
    </ChevronLink>
  );
}
