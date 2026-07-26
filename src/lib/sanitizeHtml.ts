/**
 * Isomorphic HTML sanitizer.
 *
 * DOMPurify needs a real DOM, which does not exist in the TanStack Start
 * server runtime (Cloudflare Workers) — calling `DOMPurify.sanitize` there
 * throws "DOMPurify.sanitize is not a function" and makes SSR fall back to
 * client rendering. This module implements a small allowlist sanitizer that
 * runs identically on the server and in the browser, so the markup we render
 * is sanitized in both environments and hydrates without mismatches.
 *
 * Everything not explicitly allowed is dropped, and text is escaped, so the
 * output can only ever contain the allowed tags/attributes.
 */

export type SanitizeOptions = {
  allowedTags: string[];
  allowedAttr: string[];
  /** Force target="_blank" + rel="noopener noreferrer" on anchors. */
  hardenLinks?: boolean;
  /** Class names applied to anchors (keeps link styling identical everywhere). */
  linkClass?: string;
};

/** Tags whose *content* is dropped as well, not just the tag itself. */
const DROP_CONTENT_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "template",
  "noscript",
  "svg",
  "math",
]);

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const SAFE_URL_RE = /^(?:https?:|mailto:|tel:|\/|#|\.\/|\.\.\/)/i;

function escapeText(text: string): string {
  return text
    .replace(/&(?!#?[a-zA-Z0-9]+;)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

function isSafeUrl(value: string): boolean {
  const v = Array.from(value.trim())
    .filter((character) => character.charCodeAt(0) > 0x20)
    .join("");
  if (v === "") return false;
  // Reject scheme-relative trickery like "java\nscript:alert(1)" implicitly:
  // only an explicit allowlist of prefixes passes.
  return SAFE_URL_RE.test(v);
}

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function buildAttributes(
  tag: string,
  raw: string,
  allowedAttr: Set<string>,
  hardenLinks: boolean,
  linkClass?: string,
): string {
  const attrs = new Map<string, string>();
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    const name = m[1].toLowerCase();
    const value = m[2] ?? m[3] ?? m[4] ?? "";
    if (!allowedAttr.has(name)) continue;
    if (name.startsWith("on")) continue;
    if ((name === "href" || name === "src") && !isSafeUrl(value)) continue;
    attrs.set(name, value);
  }

  if (tag === "a" && hardenLinks && attrs.has("href")) {
    attrs.set("target", "_blank");
    attrs.set("rel", "noopener noreferrer");
  }
  if (tag === "a" && linkClass) {
    attrs.set("class", linkClass);
  }

  let out = "";
  for (const [name, value] of attrs) {
    out += ` ${name}="${escapeAttr(value)}"`;
  }
  return out;
}

export function sanitizeHtml(input: string, options: SanitizeOptions): string {
  if (!input) return "";
  const allowedTags = new Set(options.allowedTags.map((t) => t.toLowerCase()));
  const allowedAttr = new Set(options.allowedAttr.map((a) => a.toLowerCase()));
  const hardenLinks = options.hardenLinks !== false;

  let out = "";
  const open: string[] = [];
  let i = 0;

  while (i < input.length) {
    const lt = input.indexOf("<", i);
    if (lt === -1) {
      out += escapeText(input.slice(i));
      break;
    }
    if (lt > i) out += escapeText(input.slice(i, lt));

    // Comments, doctypes, processing instructions: dropped entirely.
    if (input.startsWith("<!--", lt)) {
      const end = input.indexOf("-->", lt + 4);
      i = end === -1 ? input.length : end + 3;
      continue;
    }
    if (input.startsWith("<!", lt) || input.startsWith("<?", lt)) {
      const end = input.indexOf(">", lt);
      i = end === -1 ? input.length : end + 1;
      continue;
    }

    const tagMatch = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>])*)>/.exec(
      input.slice(lt),
    );
    if (!tagMatch) {
      out += "&lt;";
      i = lt + 1;
      continue;
    }

    const [full, closing, rawName, rawAttrs] = tagMatch;
    const tag = rawName.toLowerCase();
    i = lt + full.length;

    if (DROP_CONTENT_TAGS.has(tag)) {
      if (!closing) {
        const close = new RegExp(`</\\s*${tag}\\s*>`, "i").exec(input.slice(i));
        i = close ? i + close.index + close[0].length : input.length;
      }
      continue;
    }

    if (!allowedTags.has(tag)) continue;

    if (closing) {
      const idx = open.lastIndexOf(tag);
      if (idx === -1) continue;
      for (let k = open.length - 1; k >= idx; k--) out += `</${open[k]}>`;
      open.length = idx;
      continue;
    }

    const selfClosing = /\/\s*$/.test(rawAttrs) || VOID_TAGS.has(tag);
    out += `<${tag}${buildAttributes(tag, rawAttrs, allowedAttr, hardenLinks, options.linkClass)}`;
    out += selfClosing ? " />" : ">";
    if (!selfClosing) open.push(tag);
  }

  for (let k = open.length - 1; k >= 0; k--) out += `</${open[k]}>`;
  return out;
}

/** Allowlist used for space descriptions (SpaceCard). */
export const DESCRIPTION_SANITIZE_OPTIONS: SanitizeOptions = {
  allowedTags: ["a", "b", "strong", "i", "em", "br", "p", "ul", "ol", "li", "span"],
  allowedAttr: ["href", "target", "rel", "title"],
};

/** Allowlist used for inline notice/info text with [[space links]]. */
export const INLINE_SANITIZE_OPTIONS: SanitizeOptions = {
  allowedTags: ["a", "b", "strong", "i", "em", "br", "span"],
  allowedAttr: ["href", "target", "rel", "title"],
  linkClass: "font-medium text-[var(--kth-blue)] underline hover:opacity-80",
};
