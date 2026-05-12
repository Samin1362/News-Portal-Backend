import sanitizeHtml from 'sanitize-html';

/**
 * HTML sanitizer used for article content before persistence.
 *
 * Allow-list approach: only tags + attributes explicitly enumerated below pass
 * through. Anything else (script, style, on*-handlers, javascript: URLs, etc.)
 * is stripped. iframes are restricted to a small set of trusted media hosts.
 */

export const ARTICLE_ALLOWED_TAGS: string[] = [
  // Headings + structure
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr', 'span', 'div', 'section', 'article',
  // Inline emphasis / typography
  'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
  'blockquote', 'code', 'pre',
  // Lists
  'ul', 'ol', 'li',
  // Links + media
  'a', 'img', 'figure', 'figcaption',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  // Embeds (constrained by allowedIframeHostnames + allowed schemes)
  'iframe',
  // Native media
  'video', 'audio', 'source',
];

export const ARTICLE_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['class', 'id', 'lang', 'dir'],
  a: ['href', 'name', 'target', 'rel', 'title'],
  img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
  iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'title'],
  video: ['src', 'controls', 'poster', 'width', 'height', 'preload', 'loop', 'muted'],
  audio: ['src', 'controls', 'preload'],
  source: ['src', 'type', 'media'],
  table: ['border', 'cellpadding', 'cellspacing'],
  th: ['colspan', 'rowspan', 'scope'],
  td: ['colspan', 'rowspan'],
  figure: ['data-caption'],
};

const ALLOWED_IFRAME_HOSTNAMES = [
  'www.youtube.com',
  'youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'vimeo.com',
  'res.cloudinary.com',
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ARTICLE_ALLOWED_TAGS,
  allowedAttributes: ARTICLE_ALLOWED_ATTRIBUTES,
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
    iframe: ['http', 'https'],
  },
  allowedIframeHostnames: ALLOWED_IFRAME_HOSTNAMES,
  transformTags: {
    // External links open in a new tab and don't leak window.opener.
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};

/**
 * Sanitizes a chunk of article HTML against the allow-list above.
 * Idempotent: calling twice on the same input returns the same output.
 */
export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
