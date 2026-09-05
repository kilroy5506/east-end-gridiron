import Link from "next/link";
import { newsPosts } from "@/content/news";
import { formatDate } from "@/lib/format";

export default function NewsPage() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="font-heading text-xs uppercase tracking-[0.14em] text-accent">
          Recaps &amp; Reporting
        </p>
        <h1 className="font-heading text-3xl font-bold mt-1">League News</h1>
      </section>

      <section className="flex flex-col gap-3">
        {newsPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/news/${post.slug}`}
            className="rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors px-5 py-4 flex flex-col gap-1"
          >
            <span className="text-xs text-muted font-mono-num">
              {formatDate(new Date(post.date).getTime())}
            </span>
            <span className="font-heading text-lg font-semibold">{post.title}</span>
            <span className="text-sm text-muted line-clamp-2">{post.excerpt}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
