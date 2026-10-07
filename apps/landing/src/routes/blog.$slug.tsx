import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
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
      <Link to="/blog" className="blog-text-link blog-back-link">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("landing.blog.back")}
      </Link>
      <article>
        <header>
          <h1 className="blog-title">{post.title}</h1>
          <p className="blog-updated">
            {t("landing.blog.updated")}:{" "}
            <time dateTime={post.updatedAt}>{date}</time>
          </p>
        </header>
        <div className="blog-prose">
          <Content />
        </div>
      </article>
    </BlogLayout>
  );
}
