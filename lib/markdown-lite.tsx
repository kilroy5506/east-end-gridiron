// A tiny, dependency-free renderer for a small subset of Markdown, used by
// News posts that need real structure (section headings, a divider, bold,
// links) — like an awards-style draft recap — without pulling in a full
// Markdown library. Supports, block-level: "## Heading" (with an auto id
// for anchor links), "---" as a divider, and blank-line-separated
// paragraphs. Inline: **bold** and [text](url) (url can be an internal
// anchor like #team-3 or a normal link).

import Link from "next/link";
import type { ReactNode } from "react";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function renderInline(text: string): ReactNode[] {
  // Split on **bold** and [text](url) without a full parser — good enough
  // for the controlled content we generate ourselves.
  const tokens: ReactNode[] = [];
  const pattern = /(\*\*(.+?)\*\*)|(\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      tokens.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      const href = match[5];
      const isInternal = href.startsWith("#") || href.startsWith("/");
      tokens.push(
        isInternal ? (
          <Link key={key++} href={href} className="text-accent hover:underline">
            {match[4]}
          </Link>
        ) : (
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {match[4]}
          </a>
        )
      );
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }
  return tokens;
}

export function MarkdownLite({ content }: { content: string }) {
  const blocks = content.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  return (
    <>
      {blocks.map((block, i) => {
        if (block === "---") {
          return <hr key={i} className="border-border my-2" />;
        }
        if (block.startsWith("### ")) {
          const text = block.slice(4);
          return (
            <h3 key={i} id={slugify(text)} className="font-heading text-base font-semibold mt-2 scroll-mt-24">
              {renderInline(text)}
            </h3>
          );
        }
        if (block.startsWith("## ")) {
          const text = block.slice(3);
          return (
            <h2 key={i} id={slugify(text)} className="font-heading text-xl font-bold mt-4 scroll-mt-24">
              {renderInline(text)}
            </h2>
          );
        }
        if (block.startsWith("- ")) {
          const items = block.split("\n").map((line) => line.replace(/^- /, ""));
          return (
            <ul key={i} className="list-disc pl-5 flex flex-col gap-1">
              {items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block)}</p>;
      })}
    </>
  );
}
