import { useEffect } from "react";

const DEFAULT_TITLE = "Mesaro";
const DEFAULT_DESCRIPTION = "Mesaro helps restaurant owners and managers run reservations, staffing, and service in one platform.";
const SITE_URL = "https://mesaro.com";

interface HreflangEntry {
  locale: string;
  href: string;
}

interface UsePageMetaOptions {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown>;
  hreflang?: HreflangEntry[];
}

function ensureMetaTag(selector: string, createElement: () => HTMLElement): HTMLElement {
  const existing = document.querySelector(selector);
  if (existing) return existing as HTMLElement;
  const tag = createElement();
  document.head.appendChild(tag);
  return tag;
}

function ensureMeta(name: string, property?: string): HTMLMetaElement {
  const selector = property
    ? `meta[property="${property}"]`
    : `meta[name="${name}"]`;
  return ensureMetaTag(selector, () => {
    const tag = document.createElement("meta");
    if (property) tag.setAttribute("property", property);
    else tag.setAttribute("name", name);
    return tag;
  }) as HTMLMetaElement;
}

function removeTagsBySelector(selector: string) {
  document.querySelectorAll(selector).forEach((el) => el.remove());
}

export function usePageMeta({
  title,
  description,
  canonical,
  ogImage,
  jsonLd,
  hreflang,
}: UsePageMetaOptions) {
  useEffect(() => {
    const previousTitle = document.title;
    const fullTitle = `${title} | ${DEFAULT_TITLE}`;

    // --- title ---
    document.title = fullTitle;

    // --- description ---
    const descTag = ensureMeta("description");
    const prevDesc = descTag.getAttribute("content") ?? "";
    descTag.setAttribute("content", description);

    // --- og tags ---
    const ogTitleTag = ensureMeta("og:title", "og:title");
    const prevOgTitle = ogTitleTag.getAttribute("content") ?? "";
    ogTitleTag.setAttribute("content", fullTitle);

    const ogDescTag = ensureMeta("og:description", "og:description");
    const prevOgDesc = ogDescTag.getAttribute("content") ?? "";
    ogDescTag.setAttribute("content", description);

    const ogTypeTag = ensureMeta("og:type", "og:type");
    const prevOgType = ogTypeTag.getAttribute("content") ?? "";
    ogTypeTag.setAttribute("content", "website");

    let prevOgImage = "";
    let ogImageTag: HTMLMetaElement | null = null;
    if (ogImage) {
      ogImageTag = ensureMeta("og:image", "og:image");
      prevOgImage = ogImageTag.getAttribute("content") ?? "";
      ogImageTag.setAttribute("content", ogImage);
    }

    // --- twitter tags ---
    const twCardTag = ensureMeta("twitter:card");
    const prevTwCard = twCardTag.getAttribute("content") ?? "";
    twCardTag.setAttribute("content", ogImage ? "summary_large_image" : "summary");

    const twTitleTag = ensureMeta("twitter:title");
    const prevTwTitle = twTitleTag.getAttribute("content") ?? "";
    twTitleTag.setAttribute("content", fullTitle);

    const twDescTag = ensureMeta("twitter:description");
    const prevTwDesc = twDescTag.getAttribute("content") ?? "";
    twDescTag.setAttribute("content", description);

    // --- canonical ---
    let canonicalLink: HTMLLinkElement | null = null;
    let prevCanonical = "";
    const canonicalHref = canonical ?? `${SITE_URL}${window.location.pathname}`;
    canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    prevCanonical = canonicalLink.getAttribute("href") ?? "";
    canonicalLink.setAttribute("href", canonicalHref);

    // --- hreflang ---
    const addedHreflangLinks: HTMLLinkElement[] = [];
    if (hreflang && hreflang.length > 0) {
      hreflang.forEach(({ locale, href }) => {
        const link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", locale);
        link.setAttribute("href", href);
        document.head.appendChild(link);
        addedHreflangLinks.push(link);
      });
    }

    // --- JSON-LD ---
    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.createElement("script");
      jsonLdScript.setAttribute("type", "application/ld+json");
      jsonLdScript.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      descTag.setAttribute("content", prevDesc || DEFAULT_DESCRIPTION);

      ogTitleTag.setAttribute("content", prevOgTitle);
      ogDescTag.setAttribute("content", prevOgDesc);
      ogTypeTag.setAttribute("content", prevOgType);
      if (ogImageTag) ogImageTag.setAttribute("content", prevOgImage);

      twCardTag.setAttribute("content", prevTwCard);
      twTitleTag.setAttribute("content", prevTwTitle);
      twDescTag.setAttribute("content", prevTwDesc);

      if (canonicalLink) canonicalLink.setAttribute("href", prevCanonical);

      addedHreflangLinks.forEach((link) => link.remove());

      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [title, description, canonical, ogImage, jsonLd, hreflang]);
}
