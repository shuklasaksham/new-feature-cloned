import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * Per-route SEO tags. Renders <title> + meta description + robots directive
 * + basic OG twin. Pass `noindex` for gated app pages so they don't compete
 * with the public marketing pages in search results.
 */
export default function Seo({
  title,
  description,
  path = "",
  noindex = false,
}) {
  const fullTitle = title ? `${title} — Bracket` : "Bracket — Decisions for creative pros";
  const canonical = `https://use-bracket.com${path}`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
    </Helmet>
  );
}
