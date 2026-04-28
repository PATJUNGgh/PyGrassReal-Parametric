import { useEffect } from 'react';
import logoIcon from '../../../assets/logo-icon-768.png';

const BASE_TITLE = 'PyGrassReal-Ai';
const DEFAULT_DESCRIPTION = 'AI-powered node editor for 3D modeling and computational design workflows.';
const DEFAULT_SITE_URL = 'https://pygrassreal.ai';
const DEFAULT_THEME_COLOR = '#070c10';
const SOCIAL_IMAGE_WIDTH = '768';
const SOCIAL_IMAGE_HEIGHT = '768';
const LINK_TAG_DATA_KEY_ATTR = 'data-pg-link-key';
const SCRIPT_TAG_DATA_KEY_ATTR = 'data-pg-script-key';

type CrossOriginPolicy = 'anonymous' | 'use-credentials';
type ReferrerPolicy =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

interface ExternalStylesheetResource {
  /** Stable key for idempotent upsert in `<head>`. */
  key: string;
  /** Absolute or relative stylesheet URL. */
  href: string;
  /** SRI hash string (for example `sha384-...`). */
  integrity: string;
  /** CORS mode for integrity-capable cross-origin fetches. */
  crossOrigin?: CrossOriginPolicy;
  /** Referrer policy attached to generated `<link>`. */
  referrerPolicy?: ReferrerPolicy;
}

interface ExternalScriptResource {
  /** Stable key for idempotent upsert in `<head>`. */
  key: string;
  /** Script source URL. */
  src: string;
  /** SRI hash string (for example `sha384-...`). */
  integrity: string;
  /** CORS mode for script fetches. */
  crossOrigin?: CrossOriginPolicy;
  /** Referrer policy attached to generated `<script>`. */
  referrerPolicy?: ReferrerPolicy;
  /** Whether to mark script as async. */
  async?: boolean;
  /** Whether to mark script as defer. */
  defer?: boolean;
}

const RESOURCE_HINTS = [
  {
    rel: 'dns-prefetch',
    href: 'https://fonts.googleapis.com',
    key: 'dns-prefetch-fonts-googleapis',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
    key: 'preconnect-fonts-googleapis',
    crossOrigin: 'anonymous' as const,
  },
  {
    rel: 'dns-prefetch',
    href: 'https://fonts.gstatic.com',
    key: 'dns-prefetch-fonts-gstatic',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    key: 'preconnect-fonts-gstatic',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'dns-prefetch',
    href: 'https://www.googletagmanager.com',
    key: 'dns-prefetch-googletagmanager',
  },
  {
    rel: 'preconnect',
    href: 'https://www.googletagmanager.com',
    key: 'preconnect-googletagmanager',
    crossOrigin: 'anonymous' as const,
  },
] as const;

const DEFAULT_CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://xtvayweoqbfxmfozgehs.supabase.co https://n8n.srv1145228.hstgr.cloud https://api.stripe.com",
  'upgrade-insecure-requests',
] as const;
const EMPTY_EXTERNAL_STYLESHEETS: readonly ExternalStylesheetResource[] = [];
const EMPTY_EXTERNAL_SCRIPTS: readonly ExternalScriptResource[] = [];

interface UseSEOOptions {
  /** Current route path used for canonical URL and structured data. */
  resolvedPath: string;
  /** Optional page-specific title (prefixed with base title). */
  pageTitle?: string;
  /** Optional page-specific description fallback for OG/Twitter/meta. */
  pageDescription?: string;
  /** Optional CSP directive overrides. */
  cspDirectives?: readonly string[];
  /** Optional external stylesheets with enforced SRI metadata. */
  externalStylesheets?: readonly ExternalStylesheetResource[];
  /** Optional external scripts with enforced SRI metadata. */
  externalScripts?: readonly ExternalScriptResource[];
}

const upsertMetaTag = (attribute: 'name' | 'property', key: string, content: string) => {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
};

const upsertHttpEquivMetaTag = (httpEquiv: string, content: string) => {
  let tag = document.querySelector<HTMLMetaElement>(`meta[http-equiv="${httpEquiv}"]`);

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('http-equiv', httpEquiv);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
};

interface LinkTagOptions {
  rel: string;
  href: string;
  key: string;
  type?: string;
  crossOrigin?: CrossOriginPolicy;
  integrity?: string;
  referrerPolicy?: ReferrerPolicy;
}

const upsertLinkTag = ({ rel, href, key, type, crossOrigin, integrity, referrerPolicy }: LinkTagOptions) => {
  let tag = document.querySelector<HTMLLinkElement>(`link[${LINK_TAG_DATA_KEY_ATTR}="${key}"]`);
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute(LINK_TAG_DATA_KEY_ATTR, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute('rel', rel);
  tag.setAttribute('href', href);
  if (type) {
    tag.setAttribute('type', type);
  } else {
    tag.removeAttribute('type');
  }

  if (crossOrigin) {
    tag.setAttribute('crossorigin', crossOrigin);
  } else {
    tag.removeAttribute('crossorigin');
  }

  if (integrity) {
    tag.setAttribute('integrity', integrity);
  } else {
    tag.removeAttribute('integrity');
  }

  if (referrerPolicy) {
    tag.setAttribute('referrerpolicy', referrerPolicy);
  } else {
    tag.removeAttribute('referrerpolicy');
  }
};

const upsertScriptTag = ({
  key,
  src,
  integrity,
  crossOrigin = 'anonymous',
  referrerPolicy = 'strict-origin-when-cross-origin',
  async,
  defer,
}: ExternalScriptResource) => {
  let tag = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_TAG_DATA_KEY_ATTR}="${key}"]`);
  if (!tag) {
    tag = document.createElement('script');
    tag.setAttribute(SCRIPT_TAG_DATA_KEY_ATTR, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute('src', src);
  tag.setAttribute('integrity', integrity);
  tag.setAttribute('crossorigin', crossOrigin);
  tag.setAttribute('referrerpolicy', referrerPolicy);
  tag.async = Boolean(async);
  tag.defer = Boolean(defer);
};

const upsertStructuredData = (id: string, data: Record<string, unknown>) => {
  let scriptTag = document.querySelector<HTMLScriptElement>(`script#${id}`);

  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.id = id;
    scriptTag.type = 'application/ld+json';
    document.head.appendChild(scriptTag);
  }

  scriptTag.textContent = JSON.stringify(data);
};

const buildCspValue = (directives: readonly string[]): string => {
  return directives
    .map((directive) => directive.trim())
    .filter(Boolean)
    .join('; ');
};

/**
 * Synchronizes SEO/security-related `<head>` metadata for page routes.
 *
 * Side effects:
 * - Upserts title/meta/link/script tags.
 * - Updates OpenGraph/Twitter metadata and JSON-LD structured data.
 * - Applies CSP meta policy and network resource hints.
 */
export function useSEO({
  resolvedPath,
  pageTitle,
  pageDescription,
  cspDirectives,
  externalStylesheets,
  externalScripts,
}: UseSEOOptions) {
  useEffect(() => {
    const resolvedTitle = pageTitle ? `${pageTitle} | ${BASE_TITLE}` : BASE_TITLE;
    const resolvedDescription = pageDescription ?? DEFAULT_DESCRIPTION;
    const pageUrl = new URL(window.location.href || resolvedPath, window.location.origin || DEFAULT_SITE_URL);
    const canonicalUrl = pageUrl.href;
    const socialImageUrl = new URL(logoIcon, pageUrl.origin).href;
    const resolvedCsp = buildCspValue(cspDirectives?.length ? cspDirectives : DEFAULT_CSP_DIRECTIVES);
    const resolvedExternalStylesheets = externalStylesheets ?? EMPTY_EXTERNAL_STYLESHEETS;
    const resolvedExternalScripts = externalScripts ?? EMPTY_EXTERNAL_SCRIPTS;

    document.title = resolvedTitle;
    upsertMetaTag('name', 'description', resolvedDescription);
    upsertMetaTag('name', 'theme-color', DEFAULT_THEME_COLOR);
    upsertHttpEquivMetaTag('Content-Security-Policy', resolvedCsp);
    upsertMetaTag('property', 'og:title', resolvedTitle);
    upsertMetaTag('property', 'og:description', resolvedDescription);
    upsertMetaTag('property', 'og:type', 'website');
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:image', socialImageUrl);
    upsertMetaTag('property', 'og:image:secure_url', socialImageUrl);
    upsertMetaTag('property', 'og:image:width', SOCIAL_IMAGE_WIDTH);
    upsertMetaTag('property', 'og:image:height', SOCIAL_IMAGE_HEIGHT);
    upsertMetaTag('property', 'og:image:alt', `${BASE_TITLE} logo`);
    upsertMetaTag('property', 'og:site_name', BASE_TITLE);
    upsertMetaTag('name', 'twitter:card', 'summary_large_image');
    upsertMetaTag('name', 'twitter:title', resolvedTitle);
    upsertMetaTag('name', 'twitter:description', resolvedDescription);
    upsertMetaTag('name', 'twitter:image', socialImageUrl);
    upsertMetaTag('name', 'twitter:image:alt', `${BASE_TITLE} logo`);

    upsertLinkTag({
      rel: 'canonical',
      href: canonicalUrl,
      key: 'canonical',
    });
    upsertLinkTag({
      rel: 'manifest',
      href: '/manifest.json',
      key: 'manifest',
    });
    upsertLinkTag({
      rel: 'apple-touch-icon',
      href: socialImageUrl,
      key: 'apple-touch-icon',
    });

    for (const hint of RESOURCE_HINTS) {
      upsertLinkTag({
        rel: hint.rel,
        href: hint.href,
        key: hint.key,
        crossOrigin: hint.crossOrigin,
        referrerPolicy: 'strict-origin-when-cross-origin',
      });
    }

    for (const stylesheet of resolvedExternalStylesheets) {
      upsertLinkTag({
        rel: 'stylesheet',
        href: stylesheet.href,
        key: stylesheet.key,
        crossOrigin: stylesheet.crossOrigin ?? 'anonymous',
        integrity: stylesheet.integrity,
        referrerPolicy: stylesheet.referrerPolicy ?? 'strict-origin-when-cross-origin',
      });
    }

    for (const script of resolvedExternalScripts) {
      upsertScriptTag(script);
    }

    upsertStructuredData('pygrassreal-structured-data', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@id': `${pageUrl.origin}/#organization`,
          '@type': 'Organization',
          name: BASE_TITLE,
          url: pageUrl.origin,
          logo: socialImageUrl,
        },
        {
          '@id': `${canonicalUrl}#software`,
          '@type': 'SoftwareApplication',
          name: BASE_TITLE,
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web',
          url: canonicalUrl,
          description: resolvedDescription,
          publisher: {
            '@id': `${pageUrl.origin}/#organization`,
          },
        },
      ],
    });
  }, [cspDirectives, externalScripts, externalStylesheets, pageDescription, pageTitle, resolvedPath]);
}
