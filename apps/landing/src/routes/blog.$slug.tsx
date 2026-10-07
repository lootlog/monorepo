import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BlogGuideCard } from "../components/blog/blog-guide-card";
import { BlogGuideIcon } from "../components/blog/blog-guide-icon";
import { BlogLayout } from "../components/blog/blog-layout";
import { BlogNotFound } from "../components/blog/blog-not-found";
import { blogNotFoundHead, blogPageHead, blogPosts } from "../config/blog";
import Timers from "../content/blog/timery-zawsze-widoczne.mdx";
import Notifications from "../content/blog/ustawienia-powiadomien.mdx";
import Windows from "../content/blog/okna-i-skroty-klawiszowe.mdx";

const articleComponents = {
  "timery-zawsze-widoczne": Timers,
  "ustawienia-powiadomien": Notifications,
  "okna-i-skroty-klawiszowe": Windows,
};

const articleDateFormat = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "long",
  timeZone: "Europe/Warsaw",
});

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = blogPosts.find((candidate) => candidate.slug === params.slug);

    if (!post) throw notFound();

    return post;
  },
  head: ({ loaderData: post }) =>
    post
      ? blogPageHead({
          title: post.title,
          description: post.description,
          path: post.path,
          post,
        })
      : blogNotFoundHead,
  component: BlogArticle,
  notFoundComponent: BlogNotFound,
});

function BlogArticle() {
  const post = Route.useLoaderData();
  const { t } = useTranslation();
  const Content = articleComponents[post.slug];

  const date = articleDateFormat.format(new Date(post.updatedAt));

  const otherPosts = blogPosts.filter(
    (candidate) => candidate.slug !== post.slug,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Organization",
      name: post.author,
      url: "https://lootlog.pl",
    },
    mainEntityOfPage: `https://lootlog.pl${post.path}`,
    inLanguage: "pl-PL",
  };

  return (
    <BlogLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="landing-container">
        <Link to="/blog" className="blog-back-link">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("landing.blog.back")}
        </Link>
        <article className="blog-article" data-surface={post.surface}>
          <header className="blog-article-hero">
            <span aria-hidden="true" className="landing-shape blog-hero-ring" />
            <span aria-hidden="true" className="landing-shape blog-hero-dot" />
            <div className="blog-article-hero-copy">
              <p className="blog-article-eyebrow">
                <BlogGuideIcon guide={post.key} size={20} strokeWidth={2.25} />
                {t("landing.blog.guide")} {post.number}
              </p>
              <h1 className="landing-heading-display text-balance">
                {post.title}
              </h1>
              <p className="landing-lead">{post.description}</p>
              <p className="blog-article-updated">
                {t("landing.blog.updated")}:{" "}
                <time dateTime={post.updatedAt}>{date}</time>
              </p>
            </div>
            <div className="blog-article-emblem" aria-hidden="true">
              <BlogGuideIcon guide={post.key} strokeWidth={1.75} />
            </div>
          </header>
          <div className="blog-prose">
            <Content />
          </div>
        </article>
        <section className="blog-more" aria-labelledby="blog-more-title">
          <h2 id="blog-more-title" className="landing-heading-card">
            {t("landing.blog.more")}
          </h2>
          <ul className="blog-more-list">
            {otherPosts.map((otherPost) => (
              <li key={otherPost.slug}>
                <BlogGuideCard post={otherPost} heading="h3" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </BlogLayout>
  );
}
