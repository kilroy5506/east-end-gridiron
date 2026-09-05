import Link from "next/link";
import { notFound } from "next/navigation";
import { newsPosts } from "@/content/news";
import { formatDate } from "@/lib/format";

export function generateStaticParams() {
  return newsPosts.map((post) => ({ slug: post.slug }));
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = newsPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <article className="flex flex-col gap-6 max-w-2xl">
      <Link href="/news" className="text-sm text-muted hover:text-foreground">
        &larr; All news
      </Link>
      <div>
        <span className="text-xs text-muted font-mono-num">
          {formatDate(new Date(post.date).getTime())}
        </span>
        <h1 className="font-heading text-3xl font-bold mt-1 text-balance">{post.title}</h1>
      </div>
      <div className="flex flex-col gap-4 text-foreground/90 leading-relaxed">
        {post.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </article>
  );
}
