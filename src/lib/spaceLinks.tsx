import { pickLocalized, type Lang } from "@/i18n";
import { type Space } from "@/lib/spaces";
import { type ReactNode } from "react";

const SPACE_LINK_RE = /\[\[\s*([^|\]\n]+?)\s*(?:\|\s*([^|\]\n]+?)\s*)?\]\]/g;

export function parseSpaceLinks(
  text: string,
  spaces: Space[],
  lang: Lang,
  onClick: (id: string) => void,
): ReactNode[] {
  const byId = new Map(spaces.map((s) => [s.id, s]));
  const bySlug = new Map(
    spaces.filter((s) => s.slug).map((s) => [s.slug as string, s]),
  );
  const resolve = (key: string) => bySlug.get(key) ?? byId.get(key);
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  SPACE_LINK_RE.lastIndex = 0;

  while ((match = SPACE_LINK_RE.exec(text)) !== null) {
    if (match.index > last) {
      out.push(text.slice(last, match.index));
    }
    const rawId = match[1].trim();
    const customText = match[2]?.trim();
    const target = map.get(rawId);
    const label = customText || (target ? pickLocalized(target, "name", lang) : rawId);

    out.push(
      <button
        key={`space-link-${match.index}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(rawId);
        }}
        className="inline font-medium text-[var(--kth-blue)] underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary rounded"
      >
        {label}
      </button>,
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    out.push(text.slice(last));
  }
  return out;
}
